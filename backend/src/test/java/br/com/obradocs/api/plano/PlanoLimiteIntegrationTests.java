package br.com.obradocs.api.plano;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import br.com.obradocs.api.auth.AuthRateLimiter;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Testcontainers
@ActiveProfiles("test")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.jwt.secret=test-secret-with-at-least-32-bytes-long")
class PlanoLimiteIntegrationTests {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres =
            new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

    @LocalServerPort
    int port;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    PlanoLimiteService limites;

    @MockitoBean
    AuthRateLimiter rateLimiter;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void bloqueiaSegundaObraDoPlanoFreeComErroPadronizado() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Limite Obra", "owner-limite-obra@example.com");

        assertThat(post("/v1/obras", "{\"nome\":\"Primeira obra\"}", owner.token()).statusCode())
                .isEqualTo(201);

        HttpResponse<String> response = post(
                "/v1/obras",
                "{\"nome\":\"Segunda obra\"}",
                owner.token());

        assertThat(response.statusCode()).isEqualTo(409);
        JsonNode error = objectMapper.readTree(response.body());
        assertThat(error.path("code").stringValue()).isEqualTo("PLAN_LIMIT_REACHED");
        assertThat(error.path("details").path("used").longValue()).isEqualTo(1);
        assertThat(error.path("details").path("limit").intValue()).isEqualTo(1);
    }

    @Test
    void bloqueiaSegundoColaboradorDoPlanoFreeInclusivePorCodigo() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Limite Colaborador", "owner-limite-colaborador@example.com");
        UsuarioAutenticado primeiro = registrar("Primeiro Colaborador", "primeiro-colaborador@example.com");
        UsuarioAutenticado segundo = registrar("Segundo Colaborador", "segundo-colaborador@example.com");
        JsonNode obra = json(post("/v1/obras", "{\"nome\":\"Obra compartilhada\"}", owner.token()));
        String codigo = obra.path("codigo_compartilhamento").stringValue();

        assertThat(post("/v1/obras/entrar", "{\"codigo\":\"" + codigo + "\"}", primeiro.token()).statusCode())
                .isEqualTo(200);

        HttpResponse<String> response = post(
                "/v1/obras/entrar",
                "{\"codigo\":\"" + codigo + "\"}",
                segundo.token());

        assertThat(response.statusCode()).isEqualTo(409);
        assertThat(objectMapper.readTree(response.body()).path("code").stringValue())
                .isEqualTo("COLLABORATOR_LIMIT_REACHED");
    }

    @Test
    void liberaCategoriaAdicionalSomenteNoPlanoPro() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Categoria", "owner-categoria@example.com");
        JsonNode obra = json(post("/v1/obras", "{\"nome\":\"Obra categorizada\"}", owner.token()));
        String path = "/v1/obras/" + obra.path("id").stringValue() + "/categorias";

        HttpResponse<String> bloqueada = post(
                path,
                "{\"nome\":\"Contratos\",\"tipo\":\"PROJETO\"}",
                owner.token());
        assertThat(bloqueada.statusCode()).isEqualTo(409);
        assertThat(objectMapper.readTree(bloqueada.body()).path("code").stringValue())
                .isEqualTo("CATEGORY_LIMIT_REACHED");

        tornarPro(owner.id());
        assertThat(post(
                path,
                "{\"nome\":\"Contratos\",\"tipo\":\"PROJETO\"}",
                owner.token()).statusCode()).isEqualTo(201);
    }

    @Test
    void bloqueiaUploadQuandoArmazenamentoAcumuladoAtingiu500Mb() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Limite Storage", "owner-limite-storage@example.com");
        JsonNode obra = json(post("/v1/obras", "{\"nome\":\"Obra com arquivos\"}", owner.token()));
        UUID obraId = UUID.fromString(obra.path("id").stringValue());

        jdbc.update("""
                insert into documentos (id, obra_id, tipo, nome, categoria_id)
                select
                    gen_random_uuid(),
                    ?,
                    'PROJETO',
                    'limite-' || serie || '.pdf',
                    (select id from categorias_obra where obra_id = ? and tipo = 'PROJETO' limit 1)
                from generate_series(1, 50) as serie
                """,
                obraId,
                obraId);
        jdbc.update("""
                insert into arquivos (
                    id, obra_id, documento_id, revisao, tipo, nome_original,
                    storage_path, content_type, tamanho_bytes, enviado_por, created_at
                )
                select
                    gen_random_uuid(),
                    d.obra_id,
                    d.id,
                    1,
                    'PROJETO',
                    d.nome,
                    'test/' || gen_random_uuid() || '-' || d.nome,
                    'application/pdf',
                    10 * 1024 * 1024,
                    ?,
                    now()
                from documentos d
                where d.obra_id = ?
                """,
                owner.id(),
                obraId);

        assertThatThrownBy(() -> limites.reservarUpload(obraId, 1))
                .isInstanceOfSatisfying(LimitePlanoException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo("STORAGE_LIMIT_REACHED");
                    assertThat(exception.getStatus().value()).isEqualTo(413);
                    assertThat(exception.getDetails().get("limitBytes")).isEqualTo(500L * 1024 * 1024);
                });
    }

    @Test
    void serializaCriacaoDeObrasConcorrentes() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Concorrente", "owner-concorrente@example.com");
        CountDownLatch start = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            List<Future<Integer>> responses = List.of(
                    executor.submit(() -> {
                        start.await();
                        return post("/v1/obras", "{\"nome\":\"Obra concorrente A\"}", owner.token()).statusCode();
                    }),
                    executor.submit(() -> {
                        start.await();
                        return post("/v1/obras", "{\"nome\":\"Obra concorrente B\"}", owner.token()).statusCode();
                    }));
            start.countDown();

            assertThat(responses).extracting(future -> future.get())
                    .containsExactlyInAnyOrder(201, 409);
        }
    }

    @Test
    void serializaEntradaDeColaboradoresConcorrentes() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Colab Concorrente", "owner-colab-concorrente@example.com");
        UsuarioAutenticado primeiro = registrar("Colab Concorrente A", "colab-concorrente-a@example.com");
        UsuarioAutenticado segundo = registrar("Colab Concorrente B", "colab-concorrente-b@example.com");
        JsonNode obra = json(post("/v1/obras", "{\"nome\":\"Obra para concorrência\"}", owner.token()));
        String body = "{\"codigo\":\"" + obra.path("codigo_compartilhamento").stringValue() + "\"}";
        CountDownLatch start = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            List<Future<Integer>> responses = List.of(
                    executor.submit(() -> {
                        start.await();
                        return post("/v1/obras/entrar", body, primeiro.token()).statusCode();
                    }),
                    executor.submit(() -> {
                        start.await();
                        return post("/v1/obras/entrar", body, segundo.token()).statusCode();
                    }));
            start.countDown();

            assertThat(responses).extracting(future -> future.get())
                    .containsExactlyInAnyOrder(200, 409);
        }
    }

    @Test
    void reservaArmazenamentoDeFormaAtomica() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Reserva", "owner-reserva@example.com");
        JsonNode obra = json(post("/v1/obras", "{\"nome\":\"Obra reserva\"}", owner.token()));
        UUID obraId = UUID.fromString(obra.path("id").stringValue());
        CountDownLatch start = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            List<Future<String>> results = List.of(
                    executor.submit(() -> reservar(start, obraId)),
                    executor.submit(() -> reservar(start, obraId)));
            start.countDown();

            assertThat(results).extracting(future -> future.get())
                    .containsExactlyInAnyOrder("RESERVED", "STORAGE_LIMIT_REACHED");
        }
    }

    private String reservar(CountDownLatch start, UUID obraId) throws InterruptedException {
        start.await();
        try {
            limites.reservarUpload(obraId, 300L * 1024 * 1024);
            return "RESERVED";
        } catch (LimitePlanoException exception) {
            return exception.getCode();
        }
    }

    private void tornarPro(UUID usuarioId) {
        jdbc.update("""
                update assinaturas
                set plano_id = '10000000-0000-0000-0000-000000000002',
                    preco_centavos_contratado = 2490,
                    updated_at = now()
                where usuario_id = ? and status in ('ACTIVE', 'TRIALING')
                """, usuarioId);
    }

    private UsuarioAutenticado registrar(String nome, String email) throws Exception {
        JsonNode response = json(post("/auth/register", """
                {"nome":"%s","email":"%s","senha":"Senha123","aceitou_termos":true}
                """.formatted(nome, email), null));
        return new UsuarioAutenticado(
                UUID.fromString(response.path("user").path("id").stringValue()),
                response.path("access_token").stringValue());
    }

    private HttpResponse<String> post(String path, String body, String token) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode json(HttpResponse<String> response) throws Exception {
        assertThat(response.statusCode()).isBetween(200, 299);
        return objectMapper.readTree(response.body());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    record UsuarioAutenticado(UUID id, String token) {
    }
}
