package br.com.obradocs.api.obra;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import br.com.obradocs.api.auth.AuthRateLimiter;

@Testcontainers
@ActiveProfiles("test")
@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = "app.jwt.secret=test-secret-with-at-least-32-bytes-long")
class ObraIntegrationTests {

	@Container
	@ServiceConnection
	static final PostgreSQLContainer postgres =
			new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

	@LocalServerPort
	int port;

	@Autowired
	ObjectMapper objectMapper;

	@Autowired
	ObraRepository obras;

	@Autowired
	HistoricoRepository historicos;

	@MockitoBean
	AuthRateLimiter rateLimiter;

	private final HttpClient http = HttpClient.newHttpClient();

	@Test
	void criaObraComOwnerEHistoricoEmUmaTransacao() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Criacao", "owner-criacao@example.com");

		HttpResponse<String> response = post("/v1/obras", """
				{"nome":" Reforma da cozinha "}
				""", owner.token());

		assertThat(response.statusCode()).isEqualTo(201);
		JsonNode obra = json(response);
		String obraId = obra.path("id").stringValue();
		assertThat(obra.path("nome").stringValue()).isEqualTo("Reforma da cozinha");
		assertThat(obra.path("codigo_compartilhamento").stringValue())
				.matches("[A-Z0-9]{4}-[A-Z0-9]{4}");

		JsonNode permissoes = json(get("/v1/obras/" + obraId + "/permissoes", owner.token()));
		assertThat(permissoes.size()).isEqualTo(1);
		assertThat(permissoes.get(0).path("papel").stringValue()).isEqualTo("OWNER");
		assertThat(permissoes.get(0).path("profiles").path("email").stringValue())
				.isEqualTo(owner.email());

		JsonNode historico = json(get("/v1/obras/" + obraId + "/historico", owner.token()));
		assertThat(historico.size()).isEqualTo(1);
		assertThat(historico.get(0).path("acao").stringValue()).isEqualTo("CRIACAO_OBRA");
	}

	@Test
	void entradaPorCodigoConcedeEditorSemDuplicarPermissaoOuHistorico() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Entrada", "owner-entrada@example.com");
		UsuarioAutenticado editor = registrar("Editor Entrada", "editor-entrada@example.com");
		JsonNode obra = criarObra(owner, "Obra compartilhada");
		String obraId = obra.path("id").stringValue();
		String codigoSemHifen = obra.path("codigo_compartilhamento").stringValue()
				.replace("-", "")
				.toLowerCase();

		assertThat(post("/v1/obras/entrar", """
				{"codigo":"%s"}
				""".formatted(codigoSemHifen), editor.token()).statusCode()).isEqualTo(200);
		assertThat(post("/v1/obras/entrar", """
				{"codigo":"%s"}
				""".formatted(codigoSemHifen), editor.token()).statusCode()).isEqualTo(200);

		JsonNode permissoes = json(get("/v1/obras/" + obraId + "/permissoes", owner.token()));
		assertThat(permissoes.size()).isEqualTo(2);
		assertThat(permissoes).anySatisfy(permissao -> {
			assertThat(permissao.path("user_id").stringValue()).isEqualTo(editor.id().toString());
			assertThat(permissao.path("papel").stringValue()).isEqualTo("EDITOR");
		});

		JsonNode historico = json(get("/v1/obras/" + obraId + "/historico", owner.token()));
		assertThat(historico).filteredOn(item -> "ENTROU_OBRA".equals(item.path("acao").stringValue()))
				.hasSize(1);
	}

	@Test
	void aplicaPapeisEPermiteSomenteOwnerGerenciarPermissoes() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Papeis", "owner-papeis@example.com");
		UsuarioAutenticado editor = registrar("Editor Papeis", "editor-papeis@example.com");
		UsuarioAutenticado viewer = registrar("Viewer Papeis", "viewer-papeis@example.com");
		JsonNode obra = criarObra(owner, "Obra com papeis");
		String obraId = obra.path("id").stringValue();

		JsonNode editorPermissao = json(post("/v1/obras/" + obraId + "/permissoes", """
				{"email":"%s","papel":"EDITOR"}
				""".formatted(editor.email()), owner.token()));
		JsonNode viewerPermissao = json(post("/v1/obras/" + obraId + "/permissoes", """
				{"email":"%s","papel":"VIEWER"}
				""".formatted(viewer.email()), owner.token()));

		assertThat(patch("/v1/obras/" + obraId, """
				{"nome":"Viewer nao renomeia"}
				""", viewer.token()).statusCode()).isEqualTo(403);
		assertThat(patch("/v1/obras/" + obraId, """
				{"nome":"Editor renomeou"}
				""", editor.token()).statusCode()).isEqualTo(200);
		assertThat(post("/v1/obras/" + obraId + "/permissoes", """
				{"email":"%s","papel":"VIEWER"}
				""".formatted(owner.email()), editor.token()).statusCode()).isEqualTo(403);

		String viewerPermissaoId = viewerPermissao.path("id").stringValue();
		assertThat(patch("/v1/obras/" + obraId + "/permissoes/" + viewerPermissaoId, """
				{"papel":"EDITOR"}
				""", owner.token()).statusCode()).isEqualTo(200);
		assertThat(delete("/v1/obras/" + obraId + "/permissoes/" + viewerPermissaoId, owner.token())
				.statusCode()).isEqualTo(204);

		JsonNode permissoes = json(get("/v1/obras/" + obraId + "/permissoes", owner.token()));
		String ownerPermissaoId = permissoes.get(0).path("id").stringValue();
		assertThat(patch("/v1/obras/" + obraId + "/permissoes/" + ownerPermissaoId, """
				{"papel":"EDITOR"}
				""", owner.token()).statusCode()).isEqualTo(400);
		assertThat(editorPermissao.path("profiles").path("nome").stringValue()).isEqualTo("Editor Papeis");

		JsonNode historico = json(get("/v1/obras/" + obraId + "/historico", owner.token()));
		assertThat(historico).anySatisfy(item -> {
			assertThat(item.path("acao").stringValue()).isEqualTo("RENOMEAR_OBRA");
			assertThat(item.path("detalhes").path("novoNome").stringValue()).isEqualTo("Editor renomeou");
		});
	}

	@Test
	void softDeleteOcultaObraEMantemRegistroDeExclusao() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Exclusao", "owner-exclusao@example.com");
		UsuarioAutenticado editor = registrar("Editor Exclusao", "editor-exclusao@example.com");
		JsonNode obraResponse = criarObra(owner, "Obra a excluir");
		UUID obraId = UUID.fromString(obraResponse.path("id").stringValue());

		post("/v1/obras/" + obraId + "/permissoes", """
				{"email":"%s","papel":"EDITOR"}
				""".formatted(editor.email()), owner.token());

		assertThat(delete("/v1/obras/" + obraId, editor.token()).statusCode()).isEqualTo(204);
		assertThat(get("/v1/obras/" + obraId, owner.token()).statusCode()).isEqualTo(404);
		assertThat(json(get("/v1/obras", owner.token())).isEmpty()).isTrue();

		Obra excluida = obras.findById(obraId).orElseThrow();
		assertThat(excluida.getDeletedAt()).isNotNull();
		assertThat(excluida.getDeletedBy()).isEqualTo(editor.id());
		assertThat(historicos.findAllByObraIdOrderByCreatedAtDesc(obraId))
				.anySatisfy(item -> assertThat(item.getAcao()).isEqualTo("EXCLUIR_OBRA"));
	}

	@Test
	void registraDenunciaDeObraAcessivel() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Denuncia", "owner-denuncia@example.com");
		JsonNode obra = criarObra(owner, "Obra denunciada");

		HttpResponse<String> response = post("/v1/reports", """
				{"target_type":"OBRA","target_id":"%s","reason":"Conteudo inadequado para esta obra"}
				""".formatted(obra.path("id").stringValue()), owner.token());

		assertThat(response.statusCode()).isEqualTo(201);
	}

	private JsonNode criarObra(UsuarioAutenticado usuario, String nome) throws Exception {
		return json(post("/v1/obras", """
				{"nome":"%s"}
				""".formatted(nome), usuario.token()));
	}

	private UsuarioAutenticado registrar(String nome, String email) throws Exception {
		JsonNode response = json(post("/auth/register", """
				{"nome":"%s","email":"%s","senha":"Senha123","aceitou_termos":true}
				""".formatted(nome, email), null));
		return new UsuarioAutenticado(
				UUID.fromString(response.path("user").path("id").stringValue()),
				email,
				response.path("access_token").stringValue());
	}

	private HttpResponse<String> get(String path, String token) throws Exception {
		return send(path, token, "GET", null);
	}

	private HttpResponse<String> post(String path, String body, String token) throws Exception {
		return send(path, token, "POST", body);
	}

	private HttpResponse<String> patch(String path, String body, String token) throws Exception {
		return send(path, token, "PATCH", body);
	}

	private HttpResponse<String> delete(String path, String token) throws Exception {
		return send(path, token, "DELETE", null);
	}

	private HttpResponse<String> send(String path, String token, String method, String body) throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(uri(path));
		if (token != null) {
			request.header("Authorization", "Bearer " + token);
		}
		if (body != null) {
			request.header("Content-Type", "application/json");
		}
		request.method(
				method,
				body == null
						? HttpRequest.BodyPublishers.noBody()
						: HttpRequest.BodyPublishers.ofString(body));
		return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
	}

	private JsonNode json(HttpResponse<String> response) throws Exception {
		assertThat(response.statusCode()).isBetween(200, 299);
		return objectMapper.readTree(response.body());
	}

	private URI uri(String path) {
		return URI.create("http://localhost:" + port + path);
	}

	record UsuarioAutenticado(UUID id, String email, String token) {
	}
}
