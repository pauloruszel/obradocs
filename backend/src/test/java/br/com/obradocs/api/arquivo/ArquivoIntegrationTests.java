package br.com.obradocs.api.arquivo;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import br.com.obradocs.api.auth.AuthRateLimiter;

@Testcontainers
@ActiveProfiles("test")
@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = "app.jwt.secret=test-secret-with-at-least-32-bytes-long")
class ArquivoIntegrationTests {

	private static final String BUCKET = "obradocs-test";
	private static final String ACCESS_KEY = "minioadmin";
	private static final String SECRET_KEY = "minioadmin";

	@MockitoBean
	AuthRateLimiter rateLimiter;

	@Container
	@ServiceConnection
	static final PostgreSQLContainer postgres =
			new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

	@Container
	static final GenericContainer<?> minio =
			new GenericContainer<>(DockerImageName.parse("minio/minio:RELEASE.2025-04-22T22-12-26Z"))
					.withEnv("MINIO_ROOT_USER", ACCESS_KEY)
					.withEnv("MINIO_ROOT_PASSWORD", SECRET_KEY)
					.withCommand("server", "/data", "--console-address", ":9001")
					.withExposedPorts(9000)
					.waitingFor(Wait.forHttp("/minio/health/ready")
							.forPort(9000)
							.withStartupTimeout(Duration.ofMinutes(2)));

	@DynamicPropertySource
	static void storageProperties(DynamicPropertyRegistry registry) {
		registry.add(
				"app.storage.endpoint",
				() -> "http://" + minio.getHost() + ":" + minio.getMappedPort(9000));
		registry.add("app.storage.access-key-id", () -> ACCESS_KEY);
		registry.add("app.storage.secret-access-key", () -> SECRET_KEY);
		registry.add("app.storage.bucket", () -> BUCKET);
		registry.add("app.storage.region", () -> "us-east-1");
		registry.add("app.storage.url-style", () -> "path");
		registry.add("app.storage.download-url-ttl", () -> "1h");
	}

	@LocalServerPort
	int port;

	@Autowired
	ObjectMapper objectMapper;

	@Autowired
	S3Client s3;

	private final HttpClient http = HttpClient.newHttpClient();

	@BeforeEach
	void criarBucket() {
		try {
			s3.headBucket(HeadBucketRequest.builder().bucket(BUCKET).build());
		} catch (S3Exception exception) {
			if (exception.statusCode() != 404) {
				throw exception;
			}
			s3.createBucket(CreateBucketRequest.builder().bucket(BUCKET).build());
		}
	}

	@Test
	void enviaListaRenomeiaEAbreDownloadTemporario() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Arquivo", "owner-arquivo@example.com");
		JsonNode obra = criarObra(owner, "Obra com arquivos");
		String obraId = obra.path("id").stringValue();
		byte[] pdf = "%PDF-1.4\nconteudo do projeto".getBytes(StandardCharsets.UTF_8);

		HttpResponse<String> upload = upload(
				obraId, "PROJETO", "projeto.pdf", "application/pdf", pdf, owner.token());

		assertThat(upload.statusCode()).isEqualTo(201);
		JsonNode arquivo = json(upload);
		String arquivoId = arquivo.path("id").stringValue();
		assertThat(arquivo.path("nome_original").stringValue()).isEqualTo("projeto.pdf");
		assertThat(arquivo.path("content_type").stringValue()).isEqualTo("application/pdf");
		assertThat(arquivo.path("tamanho_bytes").longValue()).isEqualTo(pdf.length);
		assertThat(arquivo.path("storage_path").stringValue()).startsWith(obraId + "/");
		assertThat(arquivo.path("enviado_por_nome").stringValue()).isEqualTo("Owner Arquivo");

		JsonNode listagem = json(get(
				"/v1/obras/" + obraId + "/arquivos?tipo=PROJETO", owner.token()));
		assertThat(listagem.size()).isEqualTo(1);
		assertThat(listagem.get(0).path("enviado_por_nome").stringValue())
				.isEqualTo("Owner Arquivo");
		JsonNode metadados = json(get("/v1/arquivos/" + arquivoId, owner.token()));
		assertThat(metadados.path("nome_original").stringValue()).isEqualTo("projeto.pdf");

		JsonNode download = json(get(
				"/v1/arquivos/" + arquivoId + "/download-url", owner.token()));
		assertThat(Instant.parse(download.path("expires_at").stringValue())).isAfter(Instant.now());
		assertThat(download.path("url").stringValue()).contains("X-Amz-Expires=3600");
		HttpResponse<byte[]> conteudo = http.send(
				HttpRequest.newBuilder(URI.create(download.path("url").stringValue())).GET().build(),
				HttpResponse.BodyHandlers.ofByteArray());
		assertThat(conteudo.statusCode()).isEqualTo(200);
		assertThat(conteudo.body()).isEqualTo(pdf);

		JsonNode renomeado = json(patch(
				"/v1/arquivos/" + arquivoId,
				"""
						{"nome":"projeto-final.pdf"}
						""",
				owner.token()));
		assertThat(renomeado.path("nome_original").stringValue()).isEqualTo("projeto-final.pdf");

		JsonNode historico = json(get("/v1/obras/" + obraId + "/historico", owner.token()));
		assertThat(historico).anySatisfy(item ->
				assertThat(item.path("acao").stringValue()).isEqualTo("UPLOAD_ARQUIVO"));
		assertThat(historico).anySatisfy(item ->
				assertThat(item.path("acao").stringValue()).isEqualTo("RENOMEAR_ARQUIVO"));
	}

	@Test
	void pesquisaArquivosPorNomeEmTodasAsCategorias() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Pesquisa", "owner-pesquisa-arquivo@example.com");
		String obraId = criarObra(owner, "Obra pesquisa arquivos").path("id").stringValue();
		byte[] pdf = "%PDF-1.4\nconteudo".getBytes(StandardCharsets.UTF_8);
		byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 1, 2, 3};

		upload(obraId, "PROJETO", "Projeto Estrutural.pdf", "application/pdf", pdf, owner.token());
		upload(obraId, "FOTO", "fachada.jpg", "image/jpeg", jpeg, owner.token());

		JsonNode resultado = json(get(
				"/v1/obras/" + obraId + "/arquivos?busca=estrutural", owner.token()));

		assertThat(resultado.size()).isEqualTo(1);
		assertThat(resultado.get(0).path("nome_original").stringValue())
				.isEqualTo("Projeto Estrutural.pdf");
		assertThat(resultado.get(0).path("tipo").stringValue()).isEqualTo("PROJETO");
	}

	@Test
	void respeitaPapeisParaUploadLeituraEDownload() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Acesso", "owner-acesso-arquivo@example.com");
		UsuarioAutenticado editor = registrar("Editor Acesso", "editor-acesso-arquivo@example.com");
		UsuarioAutenticado viewer = registrar("Viewer Acesso", "viewer-acesso-arquivo@example.com");
		JsonNode obra = criarObra(owner, "Obra acesso arquivos");
		String obraId = obra.path("id").stringValue();
		String codigo = obra.path("codigo_compartilhamento").stringValue();

		post("/v1/obras/entrar", """
				{"codigo":"%s"}
				""".formatted(codigo), editor.token());
		post("/v1/obras/" + obraId + "/permissoes", """
				{"email":"%s","papel":"VIEWER"}
				""".formatted(viewer.email()), owner.token());

		byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 1, 2, 3};
		HttpResponse<String> editorUpload = upload(
				obraId, "FOTO", "foto.jpg", "image/jpeg", jpeg, editor.token());
		assertThat(editorUpload.statusCode()).isEqualTo(201);
		String arquivoId = json(editorUpload).path("id").stringValue();

		assertThat(json(get("/v1/obras/" + obraId + "/arquivos", viewer.token())).size())
				.isEqualTo(1);
		assertThat(get("/v1/arquivos/" + arquivoId + "/download-url", viewer.token()).statusCode())
				.isEqualTo(200);
		assertThat(upload(
				obraId, "FOTO", "bloqueado.jpg", "image/jpeg", jpeg, viewer.token()).statusCode())
				.isEqualTo(403);
		assertThat(patch(
				"/v1/arquivos/" + arquivoId,
				"""
						{"nome":"bloqueado.jpg"}
						""",
				viewer.token()).statusCode()).isEqualTo(403);
	}

	@Test
	void rejeitaConteudoExtensaoETamanhoInvalidos() throws Exception {
		UsuarioAutenticado owner = registrar("Owner Validacao", "owner-validacao-arquivo@example.com");
		String obraId = criarObra(owner, "Obra validacao arquivos").path("id").stringValue();
		byte[] pdf = "%PDF-1.4\nvalido".getBytes(StandardCharsets.UTF_8);

		assertThat(upload(
				obraId,
				"PROJETO",
				"falso.pdf",
				"application/pdf",
				"nao e pdf".getBytes(StandardCharsets.UTF_8),
				owner.token()).statusCode()).isEqualTo(400);
		assertThat(upload(
				obraId, "PROJETO", "tipo-errado.pdf", "image/jpeg", pdf, owner.token()).statusCode())
				.isEqualTo(400);
		assertThat(upload(
				obraId, "PROJETO", "extensao-errada.jpg", "application/pdf", pdf, owner.token()).statusCode())
				.isEqualTo(400);

		byte[] grande = new byte[10 * 1024 * 1024 + 1];
		System.arraycopy(pdf, 0, grande, 0, pdf.length);
		assertThat(upload(
				obraId, "PROJETO", "grande.pdf", "application/pdf", grande, owner.token()).statusCode())
				.isEqualTo(413);
	}

	private HttpResponse<String> upload(
			String obraId,
			String tipo,
			String nome,
			String contentType,
			byte[] conteudo,
			String token) throws Exception {
		String boundary = "----obradocs-" + UUID.randomUUID();
		ByteArrayOutputStream body = new ByteArrayOutputStream();
		body.write(("--" + boundary + "\r\n"
				+ "Content-Disposition: form-data; name=\"arquivo\"; filename=\"" + nome + "\"\r\n"
				+ "Content-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
		body.write(conteudo);
		body.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));

		HttpRequest request = HttpRequest.newBuilder(uri(
						"/v1/obras/" + obraId + "/arquivos?tipo=" + tipo))
				.header("Authorization", "Bearer " + token)
				.header("Content-Type", "multipart/form-data; boundary=" + boundary)
				.POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()))
				.build();
		return http.send(request, HttpResponse.BodyHandlers.ofString());
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
		return new UsuarioAutenticado(email, response.path("access_token").stringValue());
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

	record UsuarioAutenticado(String email, String token) {
	}
}
