package br.com.obradocs.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Testcontainers
@ActiveProfiles("test")
@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = "app.jwt.secret=test-secret-with-at-least-32-bytes-long")
class AuthIntegrationTests {

	@Container
	@ServiceConnection
	static final PostgreSQLContainer postgres =
			new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

	@LocalServerPort
	int port;

	@Autowired
	ObjectMapper objectMapper;

	@MockitoBean
	JavaMailSender mailSender;

	private final HttpClient http = HttpClient.newHttpClient();

	@Test
	void cadastraEConsultaUsuarioComJwt() throws Exception {
		HttpResponse<String> register = post("/auth/register", """
				{"nome":"Paulo Ruszel","email":"PAULO@example.com","senha":"senha123"}
				""");

		assertThat(register.statusCode()).isEqualTo(201);
		JsonNode auth = objectMapper.readTree(register.body());
		assertThat(auth.path("access_token").stringValue()).isNotBlank();
		assertThat(auth.path("token_type").stringValue()).isEqualTo("Bearer");
		assertThat(auth.path("user").path("email").stringValue()).isEqualTo("paulo@example.com");

		HttpResponse<String> login = post("/auth/login", """
				{"email":"paulo@example.com","senha":"senha123"}
				""");
		assertThat(login.statusCode()).isEqualTo(200);
		String loginToken = objectMapper.readTree(login.body()).path("access_token").stringValue();

		HttpResponse<String> me = get("/auth/me", loginToken);

		assertThat(me.statusCode()).isEqualTo(200);
		JsonNode usuario = objectMapper.readTree(me.body());
		assertThat(usuario.path("nome").stringValue()).isEqualTo("Paulo Ruszel");
		assertThat(usuario.path("ativo").asBoolean()).isTrue();
	}

	@Test
	void rejeitaCredenciaisInvalidasEEndpointSemToken() throws Exception {
		String email = "login@example.com";
		post("/auth/register", """
				{"nome":"Usuario Login","email":"%s","senha":"senha123"}
				""".formatted(email));

		HttpResponse<String> login = post("/auth/login", """
				{"email":"%s","senha":"senha-errada"}
				""".formatted(email));
		HttpResponse<String> me = get("/auth/me", null);

		assertThat(login.statusCode()).isEqualTo(401);
		assertThat(me.statusCode()).isEqualTo(401);
	}

	@Test
	void rejeitaEmailDuplicado() throws Exception {
		String body = """
				{"nome":"Usuario Duplicado","email":"duplicado@example.com","senha":"senha123"}
				""";

		assertThat(post("/auth/register", body).statusCode()).isEqualTo(201);
		assertThat(post("/auth/register", body).statusCode()).isEqualTo(409);
	}

	@Test
	void rotacionaRefreshTokenERevogaNoLogout() throws Exception {
		JsonNode register = objectMapper.readTree(post("/auth/register", """
				{"nome":"Usuario Refresh","email":"refresh@example.com","senha":"senha123"}
				""").body());
		String firstRefresh = register.path("refresh_token").stringValue();

		HttpResponse<String> refreshResponse = post("/auth/refresh", """
				{"refresh_token":"%s"}
				""".formatted(firstRefresh));
		assertThat(refreshResponse.statusCode()).isEqualTo(200);
		String secondRefresh =
				objectMapper.readTree(refreshResponse.body()).path("refresh_token").stringValue();
		assertThat(secondRefresh).isNotBlank().isNotEqualTo(firstRefresh);
		assertThat(post("/auth/refresh", """
				{"refresh_token":"%s"}
				""".formatted(firstRefresh)).statusCode()).isEqualTo(401);

		assertThat(post("/auth/logout", """
				{"refresh_token":"%s"}
				""".formatted(secondRefresh)).statusCode()).isEqualTo(204);
		assertThat(post("/auth/refresh", """
				{"refresh_token":"%s"}
				""".formatted(secondRefresh)).statusCode()).isEqualTo(401);
	}

	@Test
	void redefineSenhaComTokenRecebidoPorEmailUmaUnicaVez() throws Exception {
		String email = "reset@example.com";
		post("/auth/register", """
				{"nome":"Usuario Reset","email":"%s","senha":"senha123"}
				""".formatted(email));
		clearInvocations(mailSender);

		assertThat(post("/auth/forgot-password", """
				{"email":"%s"}
				""".formatted(email)).statusCode()).isEqualTo(204);
		ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(mailSender).send(message.capture());
		Matcher tokenMatcher = Pattern.compile("[?&]token=([A-Za-z0-9_-]+)")
				.matcher(message.getValue().getText());
		assertThat(tokenMatcher.find()).isTrue();
		String token = tokenMatcher.group(1);

		assertThat(post("/auth/reset-password", """
				{"token":"%s","senha":"NovaSenha123"}
				""".formatted(token)).statusCode()).isEqualTo(204);
		assertThat(post("/auth/login", """
				{"email":"%s","senha":"senha123"}
				""".formatted(email)).statusCode()).isEqualTo(401);
		assertThat(post("/auth/login", """
				{"email":"%s","senha":"NovaSenha123"}
				""".formatted(email)).statusCode()).isEqualTo(200);
		assertThat(post("/auth/reset-password", """
				{"token":"%s","senha":"OutraSenha123"}
				""".formatted(token)).statusCode()).isEqualTo(400);
	}

	@Test
	void permitePreflightDaAplicacaoWebConfigurada() throws Exception {
		HttpRequest request = HttpRequest.newBuilder(uri("/auth/login"))
				.header("Origin", "http://localhost:8081")
				.header("Access-Control-Request-Method", "POST")
				.method("OPTIONS", HttpRequest.BodyPublishers.noBody())
				.build();

		HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.headers().firstValue("Access-Control-Allow-Origin"))
				.contains("http://localhost:8081");
	}

	private HttpResponse<String> post(String path, String body) throws Exception {
		HttpRequest request = HttpRequest.newBuilder(uri(path))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(body))
				.build();
		return http.send(request, HttpResponse.BodyHandlers.ofString());
	}

	private HttpResponse<String> get(String path, String token) throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(uri(path)).GET();
		if (token != null) {
			request.header("Authorization", "Bearer " + token);
		}
		return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
	}

	private URI uri(String path) {
		return URI.create("http://localhost:" + port + path);
	}
}
