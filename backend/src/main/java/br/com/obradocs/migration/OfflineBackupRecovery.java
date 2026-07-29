package br.com.obradocs.migration;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.*;

import static br.com.obradocs.migration.MigrationBundle.*;

final class OfflineBackupRecovery {

    private OfflineBackupRecovery() {
    }

    static RecoveryResult recover(Path dataFile, Path backupDirectory, Path outputDirectory, ObjectMapper json) throws IOException {
        JsonNode source = json.readTree(dataFile.toFile());
        OfflineBackupInventory.Inventory inventory = OfflineBackupInventory.scan(backupDirectory);
        Map<String, OfflineBackupInventory.FileInventory> physicalFiles = physicalFiles(inventory);
        Map<UUID, JsonNode> profiles = byId(source.path("profiles"));

        List<UserData> users = new ArrayList<>();
        for (JsonNode user : source.path("users")) {
            UUID id = uuid(user, "id");
            JsonNode profile = profiles.get(id);
            String email = text(profile, "email", text(user, "email"));
            String nome = text(profile, "nome", text(user.path("raw_user_meta_data"), "nome", email));
            users.add(new UserData(id, nome, email.toLowerCase(Locale.ROOT), user.path("ativo").asBoolean(true), instant(user, "created_at")));
        }

        List<ObraData> obras = new ArrayList<>();
        Map<UUID, UUID> creators = new HashMap<>();
        for (JsonNode obra : source.path("obras")) {
            UUID id = uuid(obra, "id");
            UUID creator = uuid(obra, "created_by");
            creators.put(id, creator);
            obras.add(new ObraData(id, text(obra, "nome"), text(obra, "codigo_compartilhamento"), creator, nullableInstant(obra, "deleted_at"), nullableUuid(obra, "deleted_by"), instant(obra, "created_at")));
        }

        int repairedOwners = 0;
        List<PermissaoData> permissoes = new ArrayList<>();
        for (JsonNode permissao : source.path("permissoes")) {
            UUID obraId = uuid(permissao, "obra_id");
            UUID userId = uuid(permissao, "user_id");
            String papel = text(permissao, "papel");
            if (userId.equals(creators.get(obraId)) && !"OWNER".equals(papel)) {
                papel = "OWNER";
                repairedOwners++;
            }
            permissoes.add(new PermissaoData(uuid(permissao, "id"), obraId, userId, papel, instant(permissao, "created_at")));
        }

        Files.createDirectories(outputDirectory.resolve("files"));
        Set<String> referencedPaths = new HashSet<>();
        List<ArquivoData> arquivos = new ArrayList<>();
        for (JsonNode arquivo : source.path("arquivos")) {
            String storagePath = text(arquivo, "storage_path");
            OfflineBackupInventory.FileInventory physical = physicalFiles.get(storagePath);
            if (physical == null) {
                throw new IllegalStateException("Arquivo fisico ausente: " + storagePath);
            }
            referencedPaths.add(storagePath);
            copy(inventory, physical, outputDirectory);
            arquivos.add(new ArquivoData(uuid(arquivo, "id"), uuid(arquivo, "obra_id"), text(arquivo, "tipo"), text(arquivo, "nome_original"), storagePath, physical.contentType(), physical.tamanhoBytes(), physical.sha256(), nullableUuid(arquivo, "enviado_por"), instant(arquivo, "created_at")));
        }

        List<HistoricoData> historico = new ArrayList<>();
        for (JsonNode item : source.path("historico")) {
            JsonNode detalhes = item.get("detalhes");
            historico.add(new HistoricoData(uuid(item, "id"), uuid(item, "obra_id"), nullableUuid(item, "user_id"), text(item, "acao"), detalhes == null || detalhes.isNull() ? null : detalhes, instant(item, "created_at")));
        }

        List<String> orphanFiles = physicalFiles.keySet().stream().filter(path -> !referencedPaths.contains(path)).sorted().toList();
        MigrationBundle bundle = new MigrationBundle(CURRENT_VERSION, Instant.now(), "obras-files", sorted(users), sorted(obras), sorted(permissoes), sorted(arquivos), sorted(historico));
        bundle.validate();
        return new RecoveryResult(bundle, repairedOwners, orphanFiles);
    }

    private static Map<String, OfflineBackupInventory.FileInventory> physicalFiles(OfflineBackupInventory.Inventory inventory) {
        Map<String, OfflineBackupInventory.FileInventory> result = new HashMap<>();
        inventory.obras().stream().flatMap(obra -> obra.files().stream()).forEach(file -> result.put(file.storagePath(), file));
        return result;
    }

    private static void copy(OfflineBackupInventory.Inventory inventory, OfflineBackupInventory.FileInventory file, Path outputDirectory) throws IOException {
        Path source = Path.of(inventory.bucketDirectory()).resolve(file.storagePath()).normalize();
        Path target = outputDirectory.resolve("files").resolve(file.storagePath()).normalize();
        Files.createDirectories(target.getParent());
        Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
    }

    private static Map<UUID, JsonNode> byId(JsonNode rows) {
        Map<UUID, JsonNode> result = new HashMap<>();
        for (JsonNode row : rows) {
            result.put(uuid(row, "id"), row);
        }
        return result;
    }

    private static <T> List<T> sorted(List<T> values) {
        return values.stream().sorted(Comparator.comparing(value -> ((UUID) id(value)).toString())).toList();
    }

    private static Object id(Object value) {
        return switch (value) {
            case UserData item -> item.id();
            case ObraData item -> item.id();
            case PermissaoData item -> item.id();
            case ArquivoData item -> item.id();
            case HistoricoData item -> item.id();
            default -> throw new IllegalArgumentException("Tipo nao suportado: " + value.getClass());
        };
    }

    private static UUID uuid(JsonNode node, String field) {
        return UUID.fromString(text(node, field));
    }

    private static UUID nullableUuid(JsonNode node, String field) {
        String value = text(node, field, null);
        return value == null ? null : UUID.fromString(value);
    }

    private static Instant instant(JsonNode node, String field) {
        return Instant.parse(text(node, field));
    }

    private static Instant nullableInstant(JsonNode node, String field) {
        String value = text(node, field, null);
        return value == null ? null : Instant.parse(value);
    }

    private static String text(JsonNode node, String field) {
        String value = text(node, field, null);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Campo ausente: " + field);
        }
        return value;
    }

    private static String text(JsonNode node, String field, String fallback) {
        if (node == null || node.isNull()) {
            return fallback;
        }
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? fallback : value.stringValue();
    }

    record RecoveryResult(MigrationBundle bundle, int repairedOwners, List<String> orphanFiles) {
    }
}
