package br.com.obradocs.migration;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static br.com.obradocs.migration.MigrationBundle.*;

final class SupabaseExporter {

    private static final int PAGE_SIZE = 1000;

    private final ExportConfig config;
    private final ObjectMapper json;
    private final HttpClient http;

    SupabaseExporter(ExportConfig config, ObjectMapper json) {
        this(config, json, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build());
    }

    SupabaseExporter(ExportConfig config, ObjectMapper json, HttpClient http) {
        this.config = config;
        this.json = json;
        this.http = http;
    }

    MigrationBundle export() throws IOException, InterruptedException {
        Files.createDirectories(config.directory().resolve("files"));

        List<JsonNode> profiles = fetchTable("profiles");
        Map<UUID, JsonNode> profilesById = new HashMap<>();
        for (JsonNode profile : profiles) {
            profilesById.put(uuid(profile, "id"), profile);
        }

        List<UserData> users = exportUsers(profilesById);
        List<ObraData> obras = fetchTable("obras").stream().map(this::obra).toList();
        List<PermissaoData> permissoes = fetchTable("permissoes").stream().map(this::permissao).toList();
        List<ArquivoData> arquivos = exportFiles(fetchTable("arquivos"));
        List<HistoricoData> historico = fetchTable("historico").stream().map(this::historico).toList();

        MigrationBundle bundle = new MigrationBundle(MigrationBundle.CURRENT_VERSION, Instant.now(), config.bucket(), sorted(users, UserData::id), sorted(obras, ObraData::id), sorted(permissoes, PermissaoData::id), sorted(arquivos, ArquivoData::id), sorted(historico, HistoricoData::id));
        bundle.validate();
        json.writerWithDefaultPrettyPrinter().writeValue(config.directory().resolve("manifest.json").toFile(), bundle);
        return bundle;
    }

    private List<UserData> exportUsers(Map<UUID, JsonNode> profiles) throws IOException, InterruptedException {
        List<JsonNode> authUsers = fetchAuthUsers();
        Map<UUID, UserData> result = new HashMap<>();
        for (JsonNode authUser : authUsers) {
            UUID id = uuid(authUser, "id");
            JsonNode profile = profiles.get(id);
            String email = firstText(profile == null ? null : profile.get("email"), authUser.get("email"));
            String nome = firstText(profile == null ? null : profile.get("nome"), authUser.path("user_metadata").get("nome"), authUser.path("raw_user_meta_data").get("nome"), email == null ? null : json.getNodeFactory().stringNode(email));
            Instant createdAt = firstInstant(profile == null ? null : profile.get("created_at"), authUser.get("created_at"));
            result.put(id, new UserData(id, required(nome, "nome do usuario " + id).trim(), required(email, "e-mail do usuario " + id).trim().toLowerCase(Locale.ROOT), isActive(authUser), createdAt));
        }
        for (Map.Entry<UUID, JsonNode> entry : profiles.entrySet()) {
            if (!result.containsKey(entry.getKey())) {
                JsonNode profile = entry.getValue();
                String email = text(profile, "email");
                result.put(entry.getKey(), new UserData(entry.getKey(), text(profile, "nome").trim(), required(email, "e-mail do profile " + entry.getKey()).trim().toLowerCase(Locale.ROOT), true, instant(profile, "created_at")));
            }
        }
        return new ArrayList<>(result.values());
    }

    private List<JsonNode> fetchAuthUsers() throws IOException, InterruptedException {
        List<JsonNode> result = new ArrayList<>();
        for (int page = 1; ; page++) {
            JsonNode response = getJson(config.url() + "/auth/v1/admin/users?page=" + page + "&per_page=" + PAGE_SIZE);
            JsonNode users = response.path("users");
            if (!users.isArray()) {
                throw new IllegalStateException("Resposta invalida ao exportar usuarios");
            }
            int count = 0;
            for (JsonNode user : users) {
                result.add(user);
                count++;
            }
            if (count < PAGE_SIZE) {
                return result;
            }
        }
    }

    private List<JsonNode> fetchTable(String table) throws IOException, InterruptedException {
        List<JsonNode> result = new ArrayList<>();
        for (int offset = 0; ; offset += PAGE_SIZE) {
            JsonNode response = getJson(config.url() + "/rest/v1/" + table + "?select=*&order=created_at.asc&limit=" + PAGE_SIZE + "&offset=" + offset);
            if (!response.isArray()) {
                throw new IllegalStateException("Resposta invalida ao exportar " + table);
            }
            int count = 0;
            for (JsonNode row : response) {
                result.add(row);
                count++;
            }
            if (count < PAGE_SIZE) {
                return result;
            }
        }
    }

    private JsonNode getJson(String url) throws IOException, InterruptedException {
        HttpResponse<String> response = http.send(request(url).GET().build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("Supabase respondeu " + response.statusCode() + " em " + URI.create(url).getPath());
        }
        return json.readTree(response.body());
    }

    private List<ArquivoData> exportFiles(List<JsonNode> rows) throws IOException, InterruptedException {
        List<ArquivoData> result = new ArrayList<>();
        for (JsonNode row : rows) {
            String storagePath = text(row, "storage_path");
            DownloadedFile file = download(storagePath, text(row, "nome_original"));
            result.add(new ArquivoData(uuid(row, "id"), uuid(row, "obra_id"), text(row, "tipo"), text(row, "nome_original"), storagePath, file.contentType(), file.size(), file.sha256(), nullableUuid(row, "enviado_por"), instant(row, "created_at")));
        }
        return result;
    }

    private DownloadedFile download(String storagePath, String originalName) throws IOException, InterruptedException {
        Path target = safeFile(config.directory().resolve("files"), storagePath);
        Files.createDirectories(target.getParent());
        Path temporary = target.resolveSibling(target.getFileName() + ".part");
        String url = config.url() + "/storage/v1/object/authenticated/" + encodeSegment(config.bucket()) + "/" + encodePath(storagePath);
        HttpResponse<InputStream> response = http.send(request(url).GET().build(), HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() / 100 != 2) {
            response.body().close();
            throw new IllegalStateException("Falha ao baixar " + storagePath + ": HTTP " + response.statusCode());
        }

        MessageDigest digest = sha256Digest();
        try (InputStream input = new DigestInputStream(response.body(), digest)) {
            Files.copy(input, temporary, StandardCopyOption.REPLACE_EXISTING);
        }
        Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING);
        String contentType = normalizeContentType(response.headers().firstValue("Content-Type").orElse(null), originalName, storagePath);
        return new DownloadedFile(Files.size(target), hex(digest.digest()), contentType);
    }

    private HttpRequest.Builder request(String url) {
        return HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofMinutes(2)).header("apikey", config.serviceRoleKey()).header("Authorization", "Bearer " + config.serviceRoleKey());
    }

    private ObraData obra(JsonNode row) {
        return new ObraData(uuid(row, "id"), text(row, "nome"), text(row, "codigo_compartilhamento"), uuid(row, "created_by"), nullableInstant(row, "deleted_at"), nullableUuid(row, "deleted_by"), instant(row, "created_at"));
    }

    private PermissaoData permissao(JsonNode row) {
        return new PermissaoData(uuid(row, "id"), uuid(row, "obra_id"), uuid(row, "user_id"), text(row, "papel"), instant(row, "created_at"));
    }

    private HistoricoData historico(JsonNode row) {
        JsonNode details = row.get("detalhes");
        return new HistoricoData(uuid(row, "id"), uuid(row, "obra_id"), nullableUuid(row, "user_id"), text(row, "acao"), details == null || details.isNull() ? null : details, instant(row, "created_at"));
    }

    private static String normalizeContentType(String header, String originalName, String path) {
        String contentType = header == null ? "" : header.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        if ("application/pdf".equals(contentType) || "image/jpeg".equals(contentType)) {
            return contentType;
        }
        String name = (originalName + " " + path).toLowerCase(Locale.ROOT);
        if (name.endsWith(".pdf") || name.contains(".pdf ")) {
            return "application/pdf";
        }
        if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.contains(".jpg ") || name.contains(".jpeg ")) {
            return "image/jpeg";
        }
        throw new IllegalStateException("Content-Type nao suportado para " + path + ": " + header);
    }

    private static boolean isActive(JsonNode authUser) {
        Instant deletedAt = nullableInstant(authUser, "deleted_at");
        Instant bannedUntil = nullableInstant(authUser, "banned_until");
        return deletedAt == null && (bannedUntil == null || !bannedUntil.isAfter(Instant.now()));
    }

    private static Path safeFile(Path root, String storagePath) {
        Path normalizedRoot = root.toAbsolutePath().normalize();
        Path file = normalizedRoot.resolve(storagePath.replace('/', java.io.File.separatorChar)).normalize();
        if (!file.startsWith(normalizedRoot)) {
            throw new IllegalStateException("Caminho de storage inseguro: " + storagePath);
        }
        return file;
    }

    private static String encodePath(String path) {
        return java.util.Arrays.stream(path.split("/", -1)).map(SupabaseExporter::encodeSegment).reduce((left, right) -> left + "/" + right).orElse("");
    }

    private static String encodeSegment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static UUID uuid(JsonNode node, String field) {
        return UUID.fromString(text(node, field));
    }

    private static UUID nullableUuid(JsonNode node, String field) {
        String value = nullableText(node, field);
        return value == null ? null : UUID.fromString(value);
    }

    private static Instant instant(JsonNode node, String field) {
        String value = text(node, field);
        return Instant.parse(value);
    }

    private static Instant nullableInstant(JsonNode node, String field) {
        String value = nullableText(node, field);
        return value == null ? null : Instant.parse(value);
    }

    private static Instant firstInstant(JsonNode... values) {
        String value = firstText(values);
        if (value == null) {
            throw new IllegalStateException("created_at ausente");
        }
        return Instant.parse(value);
    }

    private static String text(JsonNode node, String field) {
        return required(nullableText(node, field), field);
    }

    private static String nullableText(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? null : value.stringValue();
    }

    private static String firstText(JsonNode... values) {
        for (JsonNode value : values) {
            if (value != null && !value.isNull() && value.stringValue() != null && !value.stringValue().isBlank()) {
                return value.stringValue();
            }
        }
        return null;
    }

    private static String required(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Campo obrigatorio ausente: " + label);
        }
        return value;
    }

    private static MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponivel", exception);
        }
    }

    private static String hex(byte[] bytes) {
        return java.util.HexFormat.of().formatHex(bytes);
    }

    private static <T> List<T> sorted(List<T> values, java.util.function.Function<T, UUID> id) {
        return values.stream().sorted(Comparator.comparing(item -> id.apply(item).toString())).toList();
    }

    record ExportConfig(String url, String serviceRoleKey, String bucket, Path directory) {

        ExportConfig {
            url = required(url, "SUPABASE_URL").replaceAll("/+$", "");
            serviceRoleKey = required(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY");
            bucket = required(bucket, "SUPABASE_BUCKET");
            directory = directory.toAbsolutePath().normalize();
        }
    }

    private record DownloadedFile(long size, String sha256, String contentType) {
    }
}
