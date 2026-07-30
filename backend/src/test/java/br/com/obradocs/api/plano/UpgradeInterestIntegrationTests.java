package br.com.obradocs.api.plano;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

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
                "app.admin.emails=admin-upgrade@example.com"
        })
class UpgradeInterestIntegrationTests {

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
    void registraAtualizaSemDuplicarEListaSomenteParaAdministrador() throws Exception {
        String userToken = registrar("Arquiteta Lead", "lead-upgrade@example.com");
        String adminToken = registrar("Admin", "admin-upgrade@example.com");

        HttpResponse<String> primeiro = post(
                "/v1/upgrade-interest",
                "{\"telefone\":\"(21) 99999-0000\",\"empresa\":\"Studio Inicial\"}",
                userToken);
        assertThat(primeiro.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(primeiro.body()).path("status").stringValue()).isEqualTo("PENDING");

        HttpResponse<String> atualizado = post(
                "/v1/upgrade-interest",
                "{\"telefone\":\"(21) 98888-0000\",\"empresa\":\"Studio Atualizado\"}",
                userToken);
        assertThat(atualizado.statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject(
                "select count(*) from upgrade_interest where email = 'lead-upgrade@example.com'",
                Long.class)).isEqualTo(1L);

        assertThat(get("/v1/upgrade-interest/admin", userToken).statusCode()).isEqualTo(403);

        HttpResponse<String> painel = get("/v1/upgrade-interest/admin", adminToken);
        assertThat(painel.statusCode()).isEqualTo(200);
        JsonNode items = objectMapper.readTree(painel.body());
        assertThat(items.size()).isEqualTo(1);
        assertThat(items.get(0).path("empresa").stringValue()).isEqualTo("Studio Atualizado");
        assertThat(items.get(0).path("telefone").stringValue()).isEqualTo("(21) 98888-0000");
    }

    private String registrar(String nome, String email) throws Exception {
        HttpResponse<String> response = post(
                "/auth/register",
                "{\"nome\":\"" + nome + "\",\"email\":\"" + email
                        + "\",\"senha\":\"Senha123\",\"aceitou_termos\":true}",
                null);
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

    private HttpResponse<String> post(String path, String body, String token) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }
}
