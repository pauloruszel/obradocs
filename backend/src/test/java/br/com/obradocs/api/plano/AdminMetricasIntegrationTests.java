package br.com.obradocs.api.plano;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

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
        properties = {
                "app.jwt.secret=test-secret-with-at-least-32-bytes-long",
                "app.admin.emails=admin-metricas@example.com"
        })
class AdminMetricasIntegrationTests {

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

    @MockitoBean
    AuthRateLimiter rateLimiter;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void agregaMetricasNoPeriodoSomenteParaAdministrador() throws Exception {
        String adminToken = registrar("Admin", "admin-metricas@example.com");
        String userToken = registrar("Colaborador", "colaborador-metricas@example.com");
        UUID adminId = usuarioId("admin-metricas@example.com");
        UUID userId = usuarioId("colaborador-metricas@example.com");
        UUID obraId = prepararDados(adminId, userId);

        String path = "/v1/admin/metricas?inicio=2026-07-01&fim=2026-07-31";
        assertThat(get(path, userToken).statusCode()).isEqualTo(403);

        HttpResponse<String> response = get(path, adminToken);
        assertThat(response.statusCode()).isEqualTo(200);
        JsonNode metricas = objectMapper.readTree(response.body());
        assertThat(metricas.path("convites_enviados").longValue()).isEqualTo(2);
        assertThat(metricas.path("convites_aceitos").longValue()).isEqualTo(1);
        assertThat(new BigDecimal(metricas.path("taxa_aceite").toString()))
                .isEqualByComparingTo("0.5000");
        assertThat(metricas.path("revisoes_enviadas").longValue()).isEqualTo(2);
        assertThat(metricas.path("aprovacoes_solicitadas").longValue()).isEqualTo(3);
        assertThat(metricas.path("aprovacoes_concluidas").longValue()).isEqualTo(2);
        assertThat(new BigDecimal(metricas.path("tempo_medio_aprovacao_horas").toString()))
                .isEqualByComparingTo("3.00");
        assertThat(metricas.path("alteracoes_solicitadas").longValue()).isEqualTo(1);
        assertThat(metricas.path("atividade_por_obra")).hasSize(1);
        assertThat(metricas.path("atividade_por_obra").get(0).path("obra_id").stringValue())
                .isEqualTo(obraId.toString());
        assertThat(metricas.path("atividade_por_obra").get(0)
                .path("usuarios_com_atividade_registrada").longValue()).isEqualTo(2);

        assertThat(get(
                "/v1/admin/metricas?inicio=2026-08-01&fim=2026-07-31",
                adminToken).statusCode()).isEqualTo(400);

        JsonNode periodoVazio = objectMapper.readTree(get(
                "/v1/admin/metricas?inicio=2026-09-01&fim=2026-09-30",
                adminToken).body());
        assertThat(periodoVazio.path("taxa_aceite").longValue()).isZero();
    }

    private UUID prepararDados(UUID adminId, UUID userId) {
        UUID obraId = UUID.randomUUID();
        UUID categoriaId = UUID.randomUUID();
        jdbc.update("""
                insert into obras (id, nome, codigo_compartilhamento, created_by, created_at)
                values (?, 'Obra com atividade', 'MTRC-2026', ?, '2026-07-01T10:00:00Z')
                """, obraId, adminId);
        jdbc.update("""
                insert into categorias_obra (id, obra_id, nome, tipo, ordem, padrao)
                values (?, ?, 'Projeto', 'PROJETO', 0, true)
                """, categoriaId, obraId);

        inserirArquivo(obraId, categoriaId, adminId, 2, "APPROVED",
                "2026-07-10T10:00:00Z", "2026-07-10T12:00:00Z");
        inserirArquivo(obraId, categoriaId, adminId, 3, "CHANGES_REQUESTED",
                "2026-07-15T08:00:00Z", "2026-07-15T12:00:00Z");
        inserirArquivo(obraId, categoriaId, adminId, 1, "PENDING",
                "2026-07-20T08:00:00Z", null);

        jdbc.update("""
                insert into obra_convites (
                    id, obra_id, email, papel, token_hash, status, expires_at,
                    invited_by, accepted_by, created_at, accepted_at
                ) values
                    (gen_random_uuid(), ?, 'aceito@example.com', 'VIEWER', 'token-aceito', 'ACCEPTED',
                        '2026-08-10T10:00:00Z', ?, ?, '2026-07-05T10:00:00Z', '2026-07-06T10:00:00Z'),
                    (gen_random_uuid(), ?, 'pendente@example.com', 'EDITOR', 'token-pendente', 'PENDING',
                        '2026-08-10T10:00:00Z', ?, null, '2026-07-07T10:00:00Z', null),
                    (gen_random_uuid(), ?, 'fora@example.com', 'VIEWER', 'token-fora', 'PENDING',
                        '2026-09-10T10:00:00Z', ?, null, '2026-08-07T10:00:00Z', null)
                """, obraId, adminId, userId, obraId, adminId, obraId, adminId);
        jdbc.update("""
                insert into historico (id, obra_id, user_id, acao, created_at) values
                    (gen_random_uuid(), ?, ?, 'TESTE', '2026-07-10T10:00:00Z'),
                    (gen_random_uuid(), ?, ?, 'TESTE', '2026-07-11T10:00:00Z'),
                    (gen_random_uuid(), ?, ?, 'TESTE', '2026-07-12T10:00:00Z'),
                    (gen_random_uuid(), ?, ?, 'TESTE', '2026-08-12T10:00:00Z')
                """, obraId, adminId, obraId, adminId, obraId, userId, obraId, userId);
        return obraId;
    }

    private void inserirArquivo(
            UUID obraId,
            UUID categoriaId,
            UUID usuarioId,
            int revisao,
            String status,
            String solicitadaAt,
            String decididaAt) {
        UUID documentoId = UUID.randomUUID();
        jdbc.update("""
                insert into documentos (id, obra_id, tipo, nome, revisao_atual, categoria_id, created_at)
                values (?, ?, 'PROJETO', ?, ?, ?, ?::timestamptz)
                """, documentoId, obraId, "Documento R" + revisao, revisao, categoriaId, solicitadaAt);
        jdbc.update("""
                insert into arquivos (
                    id, obra_id, documento_id, revisao, tipo, nome_original, storage_path,
                    content_type, tamanho_bytes, enviado_por, created_at,
                    aprovacao_status, aprovacao_solicitada_por, aprovacao_solicitada_at,
                    aprovacao_decidida_por, aprovacao_decidida_at, aprovacao_comentario
                ) values (
                    gen_random_uuid(), ?, ?, ?, 'PROJETO', ?, ?, 'application/pdf', 100, ?,
                    ?::timestamptz, ?, ?, ?::timestamptz, ?, ?::timestamptz, ?
                )
                """,
                obraId,
                documentoId,
                revisao,
                "documento-r" + revisao + ".pdf",
                "metricas/documento-r" + revisao + ".pdf",
                usuarioId,
                solicitadaAt,
                status,
                usuarioId,
                solicitadaAt,
                decididaAt == null ? null : usuarioId,
                decididaAt,
                "CHANGES_REQUESTED".equals(status) ? "Ajustar documento" : null);
    }

    private UUID usuarioId(String email) {
        return jdbc.queryForObject("select id from usuarios where email = ?", UUID.class, email);
    }

    private String registrar(String nome, String email) throws Exception {
        HttpResponse<String> response = post(
                "/auth/register",
                "{\"nome\":\"" + nome + "\",\"email\":\"" + email
                        + "\",\"senha\":\"Senha123\",\"aceitou_termos\":true}");
        assertThat(response.statusCode()).isBetween(200, 299);
        return objectMapper.readTree(response.body()).path("access_token").stringValue();
    }

    private HttpResponse<String> get(String path, String token) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(uri(path))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }
}
