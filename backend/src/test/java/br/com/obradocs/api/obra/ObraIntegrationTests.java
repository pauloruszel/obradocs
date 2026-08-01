package br.com.obradocs.api.obra;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
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
import org.mockito.ArgumentCaptor;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import br.com.obradocs.api.auth.AuthRateLimiter;
import br.com.obradocs.api.auth.BrevoEmailSender;

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

	@Autowired
	JdbcTemplate jdbc;

	@MockitoBean
	AuthRateLimiter rateLimiter;

	@MockitoBean
	BrevoEmailSender emailSender;

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
	void conviteProtegeEmailExpiracaoDuplicidadeEReutilizacao() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Convite", "owner-convite@example.com");
		UsuarioAutenticado convidado = registrar("Pessoa Convidada", "convidado@example.com");
		UsuarioAutenticado outro = registrar("Outro Usuario", "outro-convite@example.com");
		JsonNode obra = criarObra(owner, "Obra com convite");
		String obraId = obra.path("id").stringValue();

		assertThat(post("/v1/obras/" + obraId + "/convites", """
				{"email":"convidado@example.com","papel":"VIEWER"}
				""", owner.token()).statusCode()).isEqualTo(201);
		assertThat(post("/v1/obras/" + obraId + "/convites", """
				{"email":"convidado@example.com","papel":"EDITOR"}
				""", owner.token()).statusCode()).isEqualTo(409);

		ArgumentCaptor<String> links = ArgumentCaptor.forClass(String.class);
		verify(emailSender).enviarConvite(
				eq("convidado@example.com"), eq("Obra com convite"), eq(Papel.VIEWER), links.capture());
		String token = links.getValue().substring(links.getValue().indexOf("?invite=") + 8);

		assertThat(post("/v1/convites/aceitar", """
				{"token":"%s"}
				""".formatted(token), outro.token()).statusCode()).isEqualTo(403);
		assertThat(post("/v1/convites/aceitar", """
				{"token":"%s"}
				""".formatted(token), convidado.token()).statusCode()).isEqualTo(200);
		assertThat(post("/v1/convites/aceitar", """
				{"token":"%s"}
				""".formatted(token), convidado.token()).statusCode()).isEqualTo(409);

		UsuarioAutenticado expirado = registrar("Convite Expirado", "expirado@example.com");
		assertThat(post("/v1/obras/" + obraId + "/convites", """
				{"email":"expirado@example.com","papel":"EDITOR"}
				""", owner.token()).statusCode()).isEqualTo(201);
		verify(emailSender, times(2)).enviarConvite(
				org.mockito.ArgumentMatchers.anyString(),
				org.mockito.ArgumentMatchers.anyString(),
				org.mockito.ArgumentMatchers.any(),
				links.capture());
		String expiredToken = links.getAllValues().getLast();
		expiredToken = expiredToken.substring(expiredToken.indexOf("?invite=") + 8);
		jdbc.update(
				"update obra_convites set expires_at = now() - interval '1 minute' where email = ?",
				"expirado@example.com");

		assertThat(post("/v1/convites/aceitar", """
				{"token":"%s"}
				""".formatted(expiredToken), expirado.token()).statusCode()).isEqualTo(410);
		assertThat(jdbc.queryForObject(
				"select status from obra_convites where email = ?", String.class, "expirado@example.com"))
				.isEqualTo("EXPIRED");
	}

	@Test
	void criaCategoriasDoTemplateEPermiteRenomearEReordenar() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Categorias", "owner-categorias@example.com");
		JsonNode obra = json(post("/v1/obras", """
				{"nome":"Apartamento decorado","template_codigo":"INTERIORES"}
				""", owner.token()));
		String obraId = obra.path("id").stringValue();

		assertThat(obra.path("template_codigo").stringValue()).isEqualTo("INTERIORES");
		JsonNode categorias = json(get("/v1/obras/" + obraId + "/categorias", owner.token()));
		assertThat(categorias).extracting(item -> item.path("nome").stringValue())
				.containsExactly("Conceito", "Layouts", "Especificações", "Execução");

		String categoriaId = categorias.get(0).path("id").stringValue();
		assertThat(patch("/v1/obras/" + obraId + "/categorias/" + categoriaId, """
				{"nome":"Referências visuais","ordem":3}
				""", owner.token()).statusCode()).isEqualTo(200);

		JsonNode atualizadas = json(get("/v1/obras/" + obraId + "/categorias", owner.token()));
		assertThat(atualizadas).extracting(item -> item.path("nome").stringValue())
				.containsExactly("Layouts", "Especificações", "Execução", "Referências visuais");
	}

	@Test
	void planoProSalvaEReutilizaModeloDeCategorias() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Modelo", "owner-modelo@example.com");
		JsonNode bloqueado = objectMapper.readTree(post("/v1/modelos-categoria", """
				{
				  "nome":"Interiores residencial",
				  "categorias":[
				    {"nome":"Conceito","tipo":"PROJETO","ordem":0},
				    {"nome":"MobiliÃ¡rio","tipo":"PROJETO","ordem":1}
				  ]
				}
				""", owner.token()).body());
		assertThat(bloqueado.path("code").stringValue())
				.isEqualTo("CUSTOM_TEMPLATE_REQUIRES_PRO");

		tornarPro(owner.id());
		JsonNode modelo = json(post("/v1/modelos-categoria", """
				{
				  "nome":"Interiores residencial",
				  "categorias":[
				    {"nome":"Conceito","tipo":"PROJETO","ordem":0},
				    {"nome":"MobiliÃ¡rio","tipo":"PROJETO","ordem":1},
				    {"nome":"ExecuÃ§Ã£o","tipo":"FOTO","ordem":2}
				  ]
				}
				""", owner.token()));

		JsonNode obra = json(post("/v1/obras", """
				{"nome":"Apartamento modelo","modelo_id":"%s"}
				""".formatted(modelo.path("id").stringValue()), owner.token()));
		JsonNode categorias = json(get(
				"/v1/obras/" + obra.path("id").stringValue() + "/categorias",
				owner.token()));

		assertThat(categorias).extracting(item -> item.path("nome").stringValue())
				.containsExactly("Conceito", "MobiliÃ¡rio", "ExecuÃ§Ã£o");
		assertThat(json(get("/v1/modelos-categoria", owner.token()))).hasSize(1);
	}

	@Test
	void categoriasInformamCompletudeEDocumentosMantemAmbiente() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Ambiente", "owner-ambiente@example.com");
		JsonNode obra = criarObra(owner, "Casa com ambientes");
		UUID obraId = UUID.fromString(obra.path("id").stringValue());
		UUID categoriaId = jdbc.queryForObject(
				"select id from categorias_obra where obra_id = ? and tipo = 'PROJETO' limit 1",
				UUID.class,
				obraId);
		UUID documentoId = UUID.randomUUID();
		jdbc.update("""
				insert into documentos (id, obra_id, categoria_id, tipo, nome, ambiente)
				values (?, ?, ?, 'PROJETO', 'cozinha.pdf', 'Cozinha')
				""", documentoId, obraId, categoriaId);
		jdbc.update("""
				insert into arquivos (
				    id, obra_id, documento_id, revisao, tipo, nome_original,
				    storage_path, content_type, tamanho_bytes, enviado_por
				) values (?, ?, ?, 1, 'PROJETO', 'cozinha.pdf', ?, 'application/pdf', 100, ?)
				""", UUID.randomUUID(), obraId, documentoId, obraId + "/cozinha.pdf", owner.id());

		JsonNode categorias = json(get("/v1/obras/" + obraId + "/categorias", owner.token()));
		assertThat(categorias)
				.filteredOn(item -> categoriaId.toString().equals(item.path("id").stringValue()))
				.singleElement()
				.satisfies(item -> assertThat(item.path("documentos").longValue()).isEqualTo(1));

		JsonNode arquivos = json(get(
				"/v1/obras/" + obraId + "/arquivos?ambiente=Cozinha",
				owner.token()));
		assertThat(arquivos).singleElement()
				.satisfies(item -> assertThat(item.path("ambiente").stringValue())
						.isEqualTo("Cozinha"));
	}

	@Test
	void entradaPorCodigoConcedeViewerSemDuplicarPermissaoOuHistorico() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Entrada", "owner-entrada@example.com");
		UsuarioAutenticado viewer = registrar("Viewer Entrada", "viewer-entrada@example.com");
		JsonNode obra = criarObra(owner, "Obra compartilhada");
		String obraId = obra.path("id").stringValue();
		String codigoSemHifen = obra.path("codigo_compartilhamento").stringValue()
				.replace("-", "")
				.toLowerCase();

		assertThat(post("/v1/obras/entrar", """
				{"codigo":"%s"}
				""".formatted(codigoSemHifen), viewer.token()).statusCode()).isEqualTo(200);
		assertThat(post("/v1/obras/entrar", """
				{"codigo":"%s"}
				""".formatted(codigoSemHifen), viewer.token()).statusCode()).isEqualTo(200);

		JsonNode permissoes = json(get("/v1/obras/" + obraId + "/permissoes", owner.token()));
		assertThat(permissoes.size()).isEqualTo(2);
		assertThat(permissoes).anySatisfy(permissao -> {
			assertThat(permissao.path("user_id").stringValue()).isEqualTo(viewer.id().toString());
			assertThat(permissao.path("papel").stringValue()).isEqualTo("VIEWER");
		});
		assertThat(patch(
				"/v1/obras/" + obraId,
				"{\"nome\":\"Alteracao bloqueada\"}",
				viewer.token()).statusCode()).isEqualTo(403);
		assertThat(delete("/v1/obras/" + obraId, viewer.token()).statusCode()).isEqualTo(403);
		verify(rateLimiter, times(2)).check(
				startsWith("obras:entrar:ip:"), eq(10), eq(Duration.ofMinutes(5)));

		JsonNode historico = json(get("/v1/obras/" + obraId + "/historico", owner.token()));
		assertThat(historico).filteredOn(item -> "ENTROU_OBRA".equals(item.path("acao").stringValue()))
				.hasSize(1);
		assertThat(contarNotificacoes(owner.id(), "ENTROU_OBRA")).isEqualTo(1);
		assertThat(contarNotificacoes(viewer.id(), "ENTROU_OBRA")).isZero();
	}

	@Test
	void ownerRevogaRegeneraEEscolhePapelDoCodigo() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Codigo", "owner-codigo@example.com");
		UsuarioAutenticado convidado = registrar("Convidado Codigo", "convidado-codigo@example.com");
		JsonNode obra = criarObra(owner, "Obra com codigo controlado");
		String obraId = obra.path("id").stringValue();
		String codigoAntigo = obra.path("codigo_compartilhamento").stringValue();

		assertThat(put("/v1/obras/" + obraId + "/codigo-compartilhamento", """
				{"ativo":false,"papel":"VIEWER","regenerar":false}
				""", convidado.token()).statusCode()).isEqualTo(403);
		assertThat(put("/v1/obras/" + obraId + "/codigo-compartilhamento", """
				{"ativo":false,"papel":"VIEWER","regenerar":false}
				""", owner.token()).statusCode()).isEqualTo(200);
		assertThat(post("/v1/obras/entrar", """
				{"codigo":"%s"}
				""".formatted(codigoAntigo), convidado.token()).statusCode()).isEqualTo(404);

		JsonNode atualizado = json(put(
				"/v1/obras/" + obraId + "/codigo-compartilhamento",
				"""
				{"ativo":true,"papel":"EDITOR","validade_dias":7,"regenerar":true}
				""",
				owner.token()));
		String codigoNovo = atualizado.path("codigo_compartilhamento").stringValue();
		assertThat(codigoNovo).isNotEqualTo(codigoAntigo);
		assertThat(atualizado.path("codigo_compartilhamento_papel").stringValue())
				.isEqualTo("EDITOR");
		assertThat(atualizado.path("codigo_compartilhamento_expira_em").isTextual()).isTrue();

		assertThat(post("/v1/obras/entrar", """
				{"codigo":"%s"}
				""".formatted(codigoNovo), convidado.token()).statusCode()).isEqualTo(200);
		JsonNode permissoes = json(get("/v1/obras/" + obraId + "/permissoes", owner.token()));
		assertThat(permissoes).anySatisfy(permissao -> {
			assertThat(permissao.path("user_id").stringValue()).isEqualTo(convidado.id().toString());
			assertThat(permissao.path("papel").stringValue()).isEqualTo("EDITOR");
		});
	}

	@Test
	void listaContaEMarcaSomenteAsNotificacoesDoUsuario() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Notificacoes", "owner-notificacoes@example.com");
		tornarPro(owner.id());
		UsuarioAutenticado colaborador = registrar(
				"Colaborador Notificacoes", "colaborador-notificacoes@example.com");
		UsuarioAutenticado outro = registrar("Outro Usuario", "outro-notificacoes@example.com");

		for (String nome : List.of("Obra notificada 1", "Obra notificada 2")) {
			String obraId = criarObra(owner, nome).path("id").stringValue();
			assertThat(post("/v1/obras/" + obraId + "/permissoes", """
					{"email":"%s","papel":"VIEWER"}
					""".formatted(colaborador.email()), owner.token()).statusCode()).isEqualTo(201);
		}

		JsonNode notificacoes = json(get("/v1/notificacoes", colaborador.token()));
		assertThat(notificacoes).hasSize(2);
		assertThat(notificacoes).allSatisfy(notificacao -> {
			assertThat(notificacao.path("acao").stringValue()).isEqualTo("ACESSO_CONCEDIDO");
			assertThat(notificacao.path("obra_nome").stringValue()).startsWith("Obra notificada");
			assertThat(notificacao.path("autor_nome").stringValue()).isEqualTo("Owner Notificacoes");
			assertThat(notificacao.path("lida_at").isNull()).isTrue();
		});
		assertThat(json(get("/v1/notificacoes/nao-lidas/count", colaborador.token()))
				.path("quantidade").intValue()).isEqualTo(2);

		String notificacaoId = notificacoes.get(0).path("id").stringValue();
		assertThat(patch("/v1/notificacoes/" + notificacaoId + "/lida", null, outro.token()).statusCode())
				.isEqualTo(404);
		assertThat(patch("/v1/notificacoes/" + notificacaoId + "/lida", null, colaborador.token()).statusCode())
				.isEqualTo(204);
		assertThat(json(get("/v1/notificacoes/nao-lidas/count", colaborador.token()))
				.path("quantidade").intValue()).isEqualTo(1);

		assertThat(patch("/v1/notificacoes/lidas", null, colaborador.token()).statusCode()).isEqualTo(204);
		assertThat(json(get("/v1/notificacoes/nao-lidas/count", colaborador.token()))
				.path("quantidade").intValue()).isZero();
		assertThat(json(get("/v1/notificacoes", colaborador.token())))
				.allSatisfy(notificacao -> assertThat(notificacao.path("lida_at").isTextual()).isTrue());
	}

	@Test
	void aplicaPapeisEPermiteSomenteOwnerGerenciarPermissoes() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Papeis", "owner-papeis@example.com");
		tornarPro(owner.id());
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
		assertThat(contarNotificacoes(editor.id(), "ACESSO_CONCEDIDO")).isEqualTo(1);
		assertThat(contarNotificacoes(viewer.id(), "ACESSO_CONCEDIDO")).isEqualTo(1);
		assertThat(contarNotificacoes(owner.id(), "ACESSO_CONCEDIDO")).isZero();

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
	void exclusaoRemoveObraEmCascataEnfileiraStorageELiberaCota() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Exclusao", "owner-exclusao@example.com");
		UsuarioAutenticado editor = registrar("Editor Exclusao", "editor-exclusao@example.com");
		JsonNode obraResponse = criarObra(owner, "Obra a excluir");
		UUID obraId = UUID.fromString(obraResponse.path("id").stringValue());

		post("/v1/obras/" + obraId + "/permissoes", """
				{"email":"%s","papel":"EDITOR"}
				""".formatted(editor.email()), owner.token());
		String storagePath = obraId + "/arquivo.pdf";
		UUID documentoId = UUID.randomUUID();
		jdbc.update("""
				insert into documentos (id, obra_id, tipo, nome, categoria_id)
				values (
				    ?, ?, 'PROJETO', 'arquivo.pdf',
				    (select id from categorias_obra where obra_id = ? and tipo = 'PROJETO' limit 1)
				)
				""", documentoId, obraId, obraId);
		jdbc.update("""
				insert into arquivos (
				    id, obra_id, documento_id, revisao, tipo, nome_original,
				    storage_path, content_type, tamanho_bytes, enviado_por
				) values (?, ?, ?, 1, 'PROJETO', 'arquivo.pdf', ?, 'application/pdf', 100, ?)
				""", UUID.randomUUID(), obraId, documentoId, storagePath, owner.id());

		assertThat(delete("/v1/obras/" + obraId, editor.token()).statusCode()).isEqualTo(403);
		assertThat(delete("/v1/obras/" + obraId, owner.token()).statusCode()).isEqualTo(204);
		assertThat(get("/v1/obras/" + obraId, owner.token()).statusCode()).isEqualTo(404);
		assertThat(json(get("/v1/obras", owner.token())).isEmpty()).isTrue();
		assertThat(obras.findById(obraId)).isEmpty();
		assertThat(jdbc.queryForObject(
				"select count(*) from arquivos where obra_id = ?",
				Long.class,
				obraId)).isZero();
		assertThat(jdbc.queryForObject(
				"select count(*) from permissoes where obra_id = ?",
				Long.class,
				obraId)).isZero();
		assertThat(jdbc.queryForObject(
				"select count(*) from historico where obra_id = ?",
				Long.class,
				obraId)).isZero();
		assertThat(jdbc.queryForObject(
				"select count(*) from storage_deletion_queue where storage_path = ?",
				Long.class,
				storagePath)).isEqualTo(1);
		assertThat(post("/v1/obras", """
				{"nome":"Nova obra apos exclusao"}
				""", owner.token()).statusCode()).isEqualTo(201);
	}

	private int contarNotificacoes(UUID usuarioId, String acao) {
		return jdbc.queryForObject("""
				select count(*)
				from notificacoes n
				join historico h on h.id = n.historico_id
				where n.usuario_id = ? and h.acao = ?
				""", Integer.class, usuarioId, acao);
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

	private void tornarPro(UUID usuarioId) {
		jdbc.update("""
				update assinaturas
				set plano_id = '10000000-0000-0000-0000-000000000002',
				    preco_centavos_contratado = 2490,
				    updated_at = now()
				where usuario_id = ? and status in ('ACTIVE', 'TRIALING')
				""", usuarioId);
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

	private HttpResponse<String> put(String path, String body, String token) throws Exception {
		return send(path, token, "PUT", body);
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
