package br.com.obradocs.migration;

import br.com.obradocs.migration.RailwayImporter.ImportConfig;
import br.com.obradocs.migration.SupabaseExporter.ExportConfig;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class MigrationToolIntegrationTests {

    private static final String SERVICE_KEY = "service-role-secret";
    private static final String SOURCE_BUCKET = "obras-files";
    private static final String TARGET_BUCKET = "obradocs-migration-test";
    private static final String ACCESS_KEY = "minioadmin";
    private static final String SECRET_KEY = "minioadmin";
    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OBRA_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID PERMISSAO_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID ARQUIVO_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID HISTORICO_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final byte[] PDF = "%PDF-1.4\narquivo migrado".getBytes(StandardCharsets.UTF_8);
    private static final String STORAGE_PATH = OBRA_ID + "/" + ARQUIVO_ID + ".pdf";

    @Container
    static final PostgreSQLContainer postgres = new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

    @Container
    static final GenericContainer<?> minio = new GenericContainer<>(DockerImageName.parse("minio/minio:RELEASE.2025-04-22T22-12-26Z")).withEnv("MINIO_ROOT_USER", ACCESS_KEY).withEnv("MINIO_ROOT_PASSWORD", SECRET_KEY).withCommand("server", "/data").withExposedPorts(9000).waitingFor(Wait.forHttp("/minio/health/ready").forPort(9000).withStartupTimeout(Duration.ofMinutes(2)));

    @TempDir
    Path directory;

    private final ObjectMapper json = JsonMapper.builder().findAndAddModules().build();
    private HttpServer supabase;
    private S3Client s3;

    @BeforeEach
    void setUp() throws IOException {
        Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()).cleanDisabled(false).load().clean();
        Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()).load().migrate();

        s3 = s3Client();
        s3.createBucket(CreateBucketRequest.builder().bucket(TARGET_BUCKET).build());
        supabase = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        supabase.createContext("/auth/v1/admin/users", exchange -> respondJson(exchange, """
                {"users":[{
                  "id":"%s",
                  "email":"MIGRADO@example.com",
                  "created_at":"2025-01-01T10:00:00Z",
                  "user_metadata":{"nome":"Nome Auth"}
                }]}
                """.formatted(USER_ID)));
        supabase.createContext("/rest/v1/profiles", exchange -> respondJson(exchange, """
                [{
                  "id":"%s",
                  "nome":"Usuario Migrado",
                  "email":"MIGRADO@example.com",
                  "created_at":"2025-01-01T10:00:00Z"
                }]
                """.formatted(USER_ID)));
        supabase.createContext("/rest/v1/obras", exchange -> respondJson(exchange, """
                [{
                  "id":"%s",
                  "nome":"Obra Migrada",
                  "codigo_compartilhamento":"ABCD-1234",
                  "created_by":"%s",
                  "deleted_at":null,
                  "deleted_by":null,
                  "created_at":"2025-01-02T10:00:00Z"
                }]
                """.formatted(OBRA_ID, USER_ID)));
        supabase.createContext("/rest/v1/permissoes", exchange -> respondJson(exchange, """
                [{
                  "id":"%s",
                  "obra_id":"%s",
                  "user_id":"%s",
                  "papel":"OWNER",
                  "created_at":"2025-01-02T10:00:00Z"
                }]
                """.formatted(PERMISSAO_ID, OBRA_ID, USER_ID)));
        supabase.createContext("/rest/v1/arquivos", exchange -> respondJson(exchange, """
                [{
                  "id":"%s",
                  "obra_id":"%s",
                  "tipo":"PROJETO",
                  "nome_original":"projeto.pdf",
                  "storage_path":"%s",
                  "enviado_por":"%s",
                  "created_at":"2025-01-03T10:00:00Z"
                }]
                """.formatted(ARQUIVO_ID, OBRA_ID, STORAGE_PATH, USER_ID)));
        supabase.createContext("/rest/v1/historico", exchange -> respondJson(exchange, """
                [{
                  "id":"%s",
                  "obra_id":"%s",
                  "user_id":"%s",
                  "acao":"UPLOAD_ARQUIVO",
                  "detalhes":{"arquivo_id":"%s"},
                  "created_at":"2025-01-03T10:00:00Z"
                }]
                """.formatted(HISTORICO_ID, OBRA_ID, USER_ID, ARQUIVO_ID)));
        supabase.createContext("/storage/v1/object/authenticated/" + SOURCE_BUCKET + "/" + STORAGE_PATH, exchange -> respond(exchange, 200, "application/pdf", PDF));
        supabase.start();
    }

    @AfterEach
    void tearDown() {
        if (supabase != null) {
            supabase.stop(0);
        }
        if (s3 != null) {
            s3.close();
        }
    }

    @Test
    void exportaImportaEValidaTodosOsDadosEArquivo() throws Exception {
        String sourceUrl = "http://localhost:" + supabase.getAddress().getPort();
        MigrationBundle bundle = new SupabaseExporter(new ExportConfig(sourceUrl, SERVICE_KEY, SOURCE_BUCKET, directory), json).export();

        assertThat(bundle.users()).hasSize(1);
        assertThat(bundle.arquivos()).singleElement().satisfies(file -> {
            assertThat(file.tamanhoBytes()).isEqualTo(PDF.length);
            assertThat(file.contentType()).isEqualTo("application/pdf");
            assertThat(file.sha256()).hasSize(64);
        });

        ImportConfig target = new ImportConfig(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword(), minioEndpoint(), ACCESS_KEY, SECRET_KEY, TARGET_BUCKET, "us-east-1", "path", directory);
        try (RailwayImporter importer = new RailwayImporter(target, json)) {
            assertThat(importer.importBundle(bundle).arquivos()).isEqualTo(1);
            assertThat(importer.importBundle(bundle).arquivos()).isEqualTo(1);
            assertThat(importer.validate(bundle).historico()).isEqualTo(1);
        }

        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()); var statement = connection.prepareStatement("""
                select email, password_change_required from usuarios where id = ?
                """)) {
            statement.setObject(1, USER_ID);
            try (var result = statement.executeQuery()) {
                assertThat(result.next()).isTrue();
                assertThat(result.getString("email")).isEqualTo("migrado@example.com");
                assertThat(result.getBoolean("password_change_required")).isTrue();
            }
        }

        byte[] stored = s3.getObject(GetObjectRequest.builder().bucket(TARGET_BUCKET).key(STORAGE_PATH).build(), ResponseTransformer.toBytes()).asByteArray();
        assertThat(stored).isEqualTo(PDF);
    }

    private void respondJson(HttpExchange exchange, String body) throws IOException {
        assertThat(exchange.getRequestHeaders().getFirst("apikey")).isEqualTo(SERVICE_KEY);
        assertThat(exchange.getRequestHeaders().getFirst("Authorization")).isEqualTo("Bearer " + SERVICE_KEY);
        respond(exchange, 200, "application/json", body.getBytes(StandardCharsets.UTF_8));
    }

    private static void respond(HttpExchange exchange, int status, String contentType, byte[] body) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(status, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private S3Client s3Client() {
        return S3Client.builder().endpointOverride(minioEndpoint()).region(Region.US_EAST_1).credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(ACCESS_KEY, SECRET_KEY))).serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build()).httpClientBuilder(UrlConnectionHttpClient.builder()).build();
    }

    private URI minioEndpoint() {
        return URI.create("http://" + minio.getHost() + ":" + minio.getMappedPort(9000));
    }
}
