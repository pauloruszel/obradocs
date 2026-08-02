package br.com.obradocs.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
import org.springframework.jdbc.core.JdbcTemplate;
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
	BrevoEmailSender emailSender;

	@MockitoBean
	AuthRateLimiter rateLimiter;

	@Autowired
	JdbcTemplate jdbc;

	private final HttpClient http = HttpClient.newHttpClient();

	@Test
	void cadastraEConsultaUsuarioComJwt() throws Exception {
		HttpResponse<String> register = post("/auth/register", """
				{"nome":"Paulo Ruszel","email":"PAULO@example.com","senha":"Senha123","aceitou_termos":true}
				""");

		assertThat(register.statusCode()).isEqualTo(201);
		JsonNode auth = objectMapper.readTree(register.body());
		assertThat(auth.path("access_token").stringValue()).isNotBlank();
		assertThat(auth.path("token_type").stringValue()).isEqualTo("Bearer");
		assertThat(auth.path("user").path("email").stringValue()).isEqualTo("paulo@example.com");

		HttpResponse<String> login = post("/auth/login", """
				{"email":"paulo@example.com","senha":"Senha123"}
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
				{"nome":"Usuario Login","email":"%s","senha":"Senha123","aceitou_termos":true}
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
				{"nome":"Usuario Duplicado","email":"duplicado@example.com","senha":"Senha123","aceitou_termos":true}
				""";

		assertThat(post("/auth/register", body).statusCode()).isEqualTo(201);
		assertThat(post("/auth/register", body).statusCode()).isEqualTo(409);
	}

	@Test
	void excluiContaComSenhaAtualERevogaAcesso() throws Exception {
		JsonNode registration = objectMapper.readTree(post("/auth/register", """
				{"nome":"Usuario Exclusao","email":"excluir@example.com","senha":"Senha123","aceitou_termos":true}
				""").body());
		String accessToken = registration.path("access_token").stringValue();

		HttpRequest deletion = HttpRequest.newBuilder(uri("/auth/account"))
				.header("Authorization", "Bearer " + accessToken)
				.header("Content-Type", "application/json")
				.method("DELETE", HttpRequest.BodyPublishers.ofString("""
						{"senha":"Senha123"}
						"""))
				.build();

		assertThat(http.send(deletion, HttpResponse.BodyHandlers.ofString()).statusCode())
				.isEqualTo(204);
		assertThat(post("/auth/login", """
				{"email":"excluir@example.com","senha":"Senha123"}
				""").statusCode()).isEqualTo(401);
		assertThat(jdbc.queryForObject(
				"select count(*) from usuarios where email = 'excluir@example.com'",
				Integer.class)).isZero();
	}

	@Test
	void rejeitaSenhaFracaNoCadastro() throws Exception {
		HttpResponse<String> response = post("/auth/register", """
				{"nome":"Usuario Fraco","email":"fraco@example.com","senha":"senha123","aceitou_termos":true}
				""");

		assertThat(response.statusCode()).isEqualTo(400);
		assertThat(objectMapper.readTree(response.body()).path("detail").stringValue())
				.contains("letra maiúscula");
	}

	@Test
	void rotacionaRefreshTokenERevogaNoLogout() throws Exception {
		JsonNode register = objectMapper.readTree(post("/auth/register", """
				{"nome":"Usuario Refresh","email":"refresh@example.com","senha":"Senha123","aceitou_termos":true}
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
				{"nome":"Usuario Reset","email":"%s","senha":"Senha123","aceitou_termos":true}
				""".formatted(email));
		clearInvocations(emailSender);

		assertThat(post("/auth/forgot-password", """
				{"email":"%s"}
				""".formatted(email)).statusCode()).isEqualTo(204);
		ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
		verify(emailSender).enviarRedefinicao(any(Usuario.class), link.capture());
		Matcher tokenMatcher = Pattern.compile("[?&]token=([A-Za-z0-9_-]+)")
				.matcher(link.getValue());
		assertThat(tokenMatcher.find()).isTrue();
		String token = tokenMatcher.group(1);

		assertThat(post("/auth/reset-password", """
				{"token":"%s","senha":"NovaSenha123"}
				""".formatted(token)).statusCode()).isEqualTo(204);
		assertThat(post("/auth/login", """
				{"email":"%s","senha":"Senha123"}
				""".formatted(email)).statusCode()).isEqualTo(401);
		assertThat(post("/auth/login", """
				{"email":"%s","senha":"NovaSenha123"}
				""".formatted(email)).statusCode()).isEqualTo(200);
		assertThat(post("/auth/reset-password", """
				{"token":"%s","senha":"OutraSenha123"}
				""".formatted(token)).statusCode()).isEqualTo(400);
	}

	@Test
	void exigeRedefinicaoDeSenhaParaUsuarioMigrado() throws Exception {
		String email = "migrado@example.com";
		jdbc.update("""
				insert into usuarios (
				    id, nome, email, senha_hash, ativo, password_change_required
				) values (
				    gen_random_uuid(), 'Usuario Migrado', ?, '$2a$10$invalidMigrationPasswordHash000000000000000000000', true, true
				)
				""", email);

		HttpResponse<String> login = post("/auth/login", """
				{"email":"%s","senha":"qualquer-senha"}
				""".formatted(email));

		assertThat(login.statusCode()).isEqualTo(403);
		assertThat(objectMapper.readTree(login.body()).path("detail").stringValue())
				.contains("Redefinição de senha obrigatória");

		clearInvocations(emailSender);
		assertThat(post("/auth/forgot-password", """
				{"email":"%s"}
				""".formatted(email)).statusCode()).isEqualTo(204);
		ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
		verify(emailSender).enviarRedefinicao(any(Usuario.class), link.capture());
		Matcher tokenMatcher = Pattern.compile("[?&]token=([A-Za-z0-9_-]+)")
				.matcher(link.getValue());
		assertThat(tokenMatcher.find()).isTrue();

		assertThat(post("/auth/reset-password", """
				{"token":"%s","senha":"SenhaMigrada123"}
				""".formatted(tokenMatcher.group(1))).statusCode()).isEqualTo(204);
		assertThat(post("/auth/login", """
				{"email":"%s","senha":"SenhaMigrada123"}
				""".formatted(email)).statusCode()).isEqualTo(200);
		assertThat(jdbc.queryForObject(
				"select password_change_required from usuarios where email = ?",
				Boolean.class,
				email)).isFalse();
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

	@Test
	void permitePreflightPutDaAplicacaoWebConfigurada() throws Exception {
		HttpRequest request = HttpRequest.newBuilder(uri("/v1/obras/00000000-0000-0000-0000-000000000000/codigo-compartilhamento"))
				.header("Origin", "http://localhost:8081")
				.header("Access-Control-Request-Method", "PUT")
				.method("OPTIONS", HttpRequest.BodyPublishers.noBody())
				.build();

		HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.headers().firstValue("Access-Control-Allow-Methods"))
				.hasValueSatisfying(methods -> assertThat(methods).contains("PUT"));
	}

	@Test
	void abrePaginaPublicaDeRedefinicaoDeSenha() throws Exception {
		HttpResponse<String> response = get("/reset-password.html", null);

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.body()).contains("Definir nova senha");
	}

	@Test
	void abrePaginasPublicasDePrivacidadeESuporte() throws Exception {
		assertThat(get("/privacy.html", null).statusCode()).isEqualTo(200);
		assertThat(get("/terms.html", null).statusCode()).isEqualTo(200);
		assertThat(get("/support.html", null).statusCode()).isEqualTo(200);
		assertThat(get("/delete-account.html", null).statusCode()).isEqualTo(200);
	}

	@Test
	void redefineSenhaPelaPaginaHttpsAtravesDoProxy() throws Exception {
		String email = "reset-proxy@example.com";
		post("/auth/register", """
				{"nome":"Usuario Proxy","email":"%s","senha":"Senha123","aceitou_termos":true}
				""".formatted(email));
		clearInvocations(emailSender);
		post("/auth/forgot-password", """
				{"email":"%s"}
				""".formatted(email));
		ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
		verify(emailSender).enviarRedefinicao(any(Usuario.class), link.capture());
		Matcher tokenMatcher = Pattern.compile("[?&]token=([A-Za-z0-9_-]+)")
				.matcher(link.getValue());
		assertThat(tokenMatcher.find()).isTrue();

		HttpRequest request = HttpRequest.newBuilder(uri("/auth/reset-password"))
				.header("Content-Type", "application/json")
				.header("Origin", "https://obradocs-production.up.railway.app")
				.header("X-Forwarded-Host", "obradocs-production.up.railway.app")
				.header("X-Forwarded-Proto", "https")
				.header("X-Forwarded-Port", "443")
				.POST(HttpRequest.BodyPublishers.ofString("""
						{"token":"%s","senha":"NovaSenha123"}
						""".formatted(tokenMatcher.group(1))))
				.build();

		assertThat(http.send(request, HttpResponse.BodyHandlers.ofString()).statusCode())
				.isEqualTo(204);
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
