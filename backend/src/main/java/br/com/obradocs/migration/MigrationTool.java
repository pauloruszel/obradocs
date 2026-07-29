package br.com.obradocs.migration;

import br.com.obradocs.migration.RailwayImporter.ImportConfig;
import br.com.obradocs.migration.RailwayImporter.MigrationResult;
import br.com.obradocs.migration.SupabaseExporter.ExportConfig;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;

public final class MigrationTool {

    private static final ObjectMapper JSON = JsonMapper.builder().findAndAddModules().build();

    private MigrationTool() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException("Uso: migration <inventory|recover|export|import|validate>");
        }

        Map<String, String> env = System.getenv();
        Path directory = Path.of(env.getOrDefault("MIGRATION_DIR", "migration-data"));
        switch (args[0].toLowerCase(Locale.ROOT)) {
            case "inventory" -> inventory(env, directory);
            case "recover" -> recover(env, directory);
            case "export" -> export(env, directory);
            case "import" -> importBundle(env, directory, false);
            case "validate" -> importBundle(env, directory, true);
            default -> throw new IllegalArgumentException("Acao invalida: " + args[0]);
        }
    }

    private static void recover(Map<String, String> env, Path directory) throws Exception {
        Path dataFile = Path.of(required(env, "SUPABASE_DATA_FILE"));
        Path backup = Path.of(required(env, "STORAGE_BACKUP_DIR"));
        OfflineBackupRecovery.RecoveryResult result = OfflineBackupRecovery.recover(dataFile, backup, directory, JSON);
        java.nio.file.Files.createDirectories(directory);
        Path manifest = directory.resolve("manifest.json");
        JSON.writerWithDefaultPrettyPrinter().writeValue(manifest.toFile(), result.bundle());
        Path report = directory.resolve("recovery-report.json");
        JSON.writerWithDefaultPrettyPrinter().writeValue(report.toFile(), Map.of(
                "ownersCorrigidos", result.repairedOwners(),
                "arquivosOrfaos", result.orphanFiles()));
        System.out.printf("""
                Recuperacao concluida em %s
                usuarios=%d obras=%d permissoes=%d arquivos=%d historico=%d owners_corrigidos=%d orfaos=%d
                """, manifest.toAbsolutePath().normalize(), result.bundle().users().size(), result.bundle().obras().size(), result.bundle().permissoes().size(), result.bundle().arquivos().size(), result.bundle().historico().size(), result.repairedOwners(), result.orphanFiles().size());
    }

    private static void inventory(Map<String, String> env, Path directory) throws Exception {
        Path backup = Path.of(required(env, "STORAGE_BACKUP_DIR"));
        OfflineBackupInventory.Inventory inventory = OfflineBackupInventory.scan(backup);
        java.nio.file.Files.createDirectories(directory);
        Path output = directory.resolve("recovery-inventory.json");
        JSON.writerWithDefaultPrettyPrinter().writeValue(output.toFile(), inventory);
        System.out.printf("""
                Inventario concluido em %s
                obras=%d arquivos=%d bytes=%d tipos_pendentes=%d
                """, output.toAbsolutePath().normalize(), inventory.obras().size(), inventory.fileCount(), inventory.totalBytes(), inventory.filesRequiringReview());
    }

    private static void export(Map<String, String> env, Path directory) throws Exception {
        ExportConfig config = new ExportConfig(env.get("SUPABASE_URL"), env.get("SUPABASE_SERVICE_ROLE_KEY"), env.getOrDefault("SUPABASE_BUCKET", "obras-files"), directory);
        long start = System.nanoTime();
        MigrationBundle bundle = new SupabaseExporter(config, JSON).export();
        print("Exportacao concluida", MigrationResult.from(bundle), start, directory);
    }

    private static void importBundle(Map<String, String> env, Path directory, boolean validateOnly) throws Exception {
        Path manifest = directory.resolve("manifest.json");
        MigrationBundle bundle = JSON.readValue(manifest.toFile(), MigrationBundle.class);
        ImportConfig config = new ImportConfig(jdbcUrl(env), required(env, "PGUSER"), required(env, "PGPASSWORD"), URI.create(required(env, "AWS_ENDPOINT_URL")), required(env, "AWS_ACCESS_KEY_ID"), required(env, "AWS_SECRET_ACCESS_KEY"), required(env, "AWS_S3_BUCKET_NAME"), env.getOrDefault("AWS_DEFAULT_REGION", "auto"), env.getOrDefault("AWS_S3_URL_STYLE", "virtual"), directory);

        long start = System.nanoTime();
        try (RailwayImporter importer = new RailwayImporter(config, JSON)) {
            MigrationResult result = validateOnly ? importer.validate(bundle) : importer.importBundle(bundle);
            print(validateOnly ? "Validacao concluida" : "Importacao concluida", result, start, directory);
        }
    }

    private static String jdbcUrl(Map<String, String> env) {
        String explicit = env.get("JDBC_DATABASE_URL");
        if (explicit != null && !explicit.isBlank()) {
            return explicit;
        }
        return "jdbc:postgresql://%s:%s/%s".formatted(required(env, "PGHOST"), env.getOrDefault("PGPORT", "5432"), required(env, "PGDATABASE"));
    }

    private static String required(Map<String, String> env, String name) {
        String value = env.get(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " nao configurada");
        }
        return value;
    }

    private static void print(String title, MigrationResult result, long start, Path directory) {
        System.out.printf("""
                %s em %s
                usuarios=%d obras=%d permissoes=%d arquivos=%d historico=%d
                duracao=%s
                """, title, directory.toAbsolutePath().normalize(), result.users(), result.obras(), result.permissoes(), result.arquivos(), result.historico(), Duration.ofNanos(System.nanoTime() - start));
    }
}
