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
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import br.com.obradocs.api.auth.AuthRateLimiter;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

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
        registry.add("app.storage.endpoint", () -> "http://" + minio.getHost() + ":" + minio.getMappedPort(9000));
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

    @Autowired
    JdbcTemplate jdbc;

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
        assertThat(arquivo.path("documento_nome").stringValue()).isEqualTo("projeto.pdf");
        assertThat(arquivo.path("revisao").intValue()).isEqualTo(1);
        assertThat(arquivo.path("atual").booleanValue()).isTrue();

        JsonNode listagem = json(get("/v1/obras/" + obraId + "/arquivos?tipo=PROJETO", owner.token()));
        assertThat(listagem.size()).isEqualTo(1);
        assertThat(listagem.get(0).path("enviado_por_nome").stringValue()).isEqualTo("Owner Arquivo");

        JsonNode download = json(get("/v1/arquivos/" + arquivoId + "/download-url", owner.token()));
        assertThat(Instant.parse(download.path("expires_at").stringValue())).isAfter(Instant.now());
        assertThat(download.path("url").stringValue()).contains("X-Amz-Expires=3600");

        HttpResponse<byte[]> conteudo = http.send(
                HttpRequest.newBuilder(URI.create(download.path("url").stringValue())).GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        assertThat(conteudo.statusCode()).isEqualTo(200);
        assertThat(conteudo.body()).isEqualTo(pdf);

        JsonNode renomeado = json(patch(
                "/v1/arquivos/" + arquivoId,
                "{\"nome\":\"projeto-final.pdf\"}",
                owner.token()));
        assertThat(renomeado.path("documento_nome").stringValue()).isEqualTo("projeto-final.pdf");
        assertThat(renomeado.path("nome_original").stringValue()).isEqualTo("projeto.pdf");
    }

    @Test
    void preservaRevisoesEListaSomenteAVersaoAtual() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Revisao", "owner-revisao@example.com");
        UsuarioAutenticado colaborador = registrar("Colaborador Revisao", "colaborador-revisao@example.com");
        JsonNode obra = criarObra(owner, "Obra com revisoes");
        String obraId = obra.path("id").stringValue();
        String codigo = obra.path("codigo_compartilhamento").stringValue();
        assertThat(post("/v1/obras/entrar", "{\"codigo\":\"" + codigo + "\"}", colaborador.token())
                .statusCode()).isEqualTo(200);
        byte[] r1 = "%PDF-1.4\nrevisao um".getBytes(StandardCharsets.UTF_8);
        byte[] r2 = "%PDF-1.4\nrevisao dois".getBytes(StandardCharsets.UTF_8);

        JsonNode primeira = json(upload(
                obraId, "PROJETO", "estrutural-r1.pdf", "application/pdf", r1, owner.token()));
        String primeiraId = primeira.path("id").stringValue();
        byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 1, 2, 3};
        assertThat(uploadRevisao(
                primeiraId, "estrutural-r2.jpg", "image/jpeg", jpeg, owner.token()).statusCode())
                .isEqualTo(400);
        JsonNode segunda = json(uploadRevisao(
                primeiraId, "estrutural-r2.pdf", "application/pdf", r2, owner.token()));

        assertThat(segunda.path("documento_id").stringValue())
                .isEqualTo(primeira.path("documento_id").stringValue());
        assertThat(segunda.path("revisao").intValue()).isEqualTo(2);
        assertThat(segunda.path("revisao_atual").intValue()).isEqualTo(2);
        assertThat(segunda.path("atual").booleanValue()).isTrue();

        JsonNode listagem = json(get("/v1/obras/" + obraId + "/arquivos?tipo=PROJETO", owner.token()));
        assertThat(listagem).hasSize(1);
        assertThat(listagem.get(0).path("id").stringValue()).isEqualTo(segunda.path("id").stringValue());

        JsonNode revisoes = json(get("/v1/arquivos/" + primeiraId + "/revisoes", owner.token()));
        assertThat(revisoes).hasSize(2);
        assertThat(revisoes.get(0).path("revisao").intValue()).isEqualTo(2);
        assertThat(revisoes.get(0).path("atual").booleanValue()).isTrue();
        assertThat(revisoes.get(1).path("revisao").intValue()).isEqualTo(1);
        assertThat(revisoes.get(1).path("atual").booleanValue()).isFalse();

        assertThat(contarNotificacoes(colaborador.email(), "UPLOAD_ARQUIVO")).isEqualTo(1);
        assertThat(contarNotificacoes(colaborador.email(), "NOVA_REVISAO")).isEqualTo(1);
        assertThat(contarNotificacoes(owner.email(), "UPLOAD_ARQUIVO")).isZero();
        assertThat(contarNotificacoes(owner.email(), "NOVA_REVISAO")).isZero();

        json(patch(
                "/v1/arquivos/" + primeiraId,
                "{\"nome\":\"estrutural.pdf\"}",
                owner.token()));
        JsonNode revisoesRenomeadas = json(get(
                "/v1/arquivos/" + segunda.path("id").stringValue() + "/revisoes",
                owner.token()));
        assertThat(revisoesRenomeadas.get(0).path("documento_nome").stringValue())
                .isEqualTo("estrutural.pdf");
        assertThat(revisoesRenomeadas.get(1).path("documento_nome").stringValue())
                .isEqualTo("estrutural.pdf");
        assertThat(revisoesRenomeadas.get(1).path("nome_original").stringValue())
                .isEqualTo("estrutural-r1.pdf");

        JsonNode downloadR1 = json(get("/v1/arquivos/" + primeiraId + "/download-url", owner.token()));
        HttpResponse<byte[]> conteudoR1 = http.send(
                HttpRequest.newBuilder(URI.create(downloadR1.path("url").stringValue())).GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        assertThat(conteudoR1.body()).isEqualTo(r1);
    }

    @Test
    void controlaSolicitacaoDecisaoERevisaoOficialAprovada() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Aprovacao", "owner-aprovacao@example.com");
        UsuarioAutenticado editor = registrar("Editor Aprovacao", "editor-aprovacao@example.com");
        JsonNode obra = criarObra(owner, "Obra com aprovacao");
        String obraId = obra.path("id").stringValue();
        String codigo = obra.path("codigo_compartilhamento").stringValue();
        assertThat(post("/v1/obras/entrar", "{\"codigo\":\"" + codigo + "\"}", editor.token()).statusCode())
                .isEqualTo(200);

        byte[] r1 = "%PDF-1.4\nrevisao para aprovar".getBytes(StandardCharsets.UTF_8);
        JsonNode primeira = json(upload(
                obraId, "PROJETO", "projeto-r1.pdf", "application/pdf", r1, owner.token()));
        String primeiraId = primeira.path("id").stringValue();

        assertThat(post(
                "/v1/arquivos/" + primeiraId + "/aprovacao/solicitar",
                null,
                editor.token()).statusCode()).isEqualTo(403);

        JsonNode permissoes = json(get("/v1/obras/" + obraId + "/permissoes", owner.token()));
        String editorPermissaoId = null;
        for (JsonNode permissao : permissoes) {
            if (editor.email().equals(permissao.path("profiles").path("email").stringValue())) {
                editorPermissaoId = permissao.path("id").stringValue();
                break;
            }
        }
        assertThat(editorPermissaoId).isNotNull();
        assertThat(patch(
                "/v1/obras/" + obraId + "/permissoes/" + editorPermissaoId,
                "{\"papel\":\"EDITOR\"}",
                owner.token()).statusCode()).isEqualTo(200);

        JsonNode pendente = json(post(
                "/v1/arquivos/" + primeiraId + "/aprovacao/solicitar",
                null,
                editor.token()));
        assertThat(pendente.path("aprovacao_status").stringValue()).isEqualTo("PENDING");
        assertThat(pendente.path("aprovacao_solicitada_por").stringValue()).isNotBlank();
        assertThat(pendente.path("aprovacao_solicitada_at").stringValue()).isNotBlank();
        assertThat(pendente.path("revisao_aprovada").isNull()).isTrue();

        assertThat(post(
                "/v1/arquivos/" + primeiraId + "/aprovacao/decidir",
                "{\"decisao\":\"APPROVED\"}",
                editor.token()).statusCode()).isEqualTo(403);
        assertThat(post(
                "/v1/arquivos/" + primeiraId + "/aprovacao/decidir",
                "{\"decisao\":\"CHANGES_REQUESTED\"}",
                owner.token()).statusCode()).isEqualTo(400);

        JsonNode aprovada = json(post(
                "/v1/arquivos/" + primeiraId + "/aprovacao/decidir",
                "{\"decisao\":\"APPROVED\"}",
                owner.token()));
        assertThat(aprovada.path("aprovacao_status").stringValue()).isEqualTo("APPROVED");
        assertThat(aprovada.path("revisao_aprovada").intValue()).isEqualTo(1);
        assertThat(aprovada.path("oficial_aprovada").booleanValue()).isTrue();
        assertThat(aprovada.path("aprovacao_decidida_por").stringValue()).isNotBlank();
        assertThat(aprovada.path("aprovacao_decidida_at").stringValue()).isNotBlank();
        assertThat(post(
                "/v1/arquivos/" + primeiraId + "/aprovacao/decidir",
                "{\"decisao\":\"CHANGES_REQUESTED\",\"comentario\":\"Rever cotas\"}",
                owner.token()).statusCode()).isEqualTo(400);

        byte[] r2 = "%PDF-1.4\nnova revisao ainda nao aprovada".getBytes(StandardCharsets.UTF_8);
        JsonNode segunda = json(uploadRevisao(
                primeiraId, "projeto-r2.pdf", "application/pdf", r2, editor.token()));
        assertThat(segunda.path("revisao").intValue()).isEqualTo(2);
        assertThat(segunda.path("atual").booleanValue()).isTrue();
        assertThat(segunda.path("revisao_aprovada").intValue()).isEqualTo(1);
        assertThat(segunda.path("oficial_aprovada").booleanValue()).isFalse();
        assertThat(segunda.path("aprovacao_status").isNull()).isTrue();

        String segundaId = segunda.path("id").stringValue();
        json(post(
                "/v1/arquivos/" + segundaId + "/aprovacao/solicitar",
                null,
                editor.token()));
        JsonNode alteracoes = json(post(
                "/v1/arquivos/" + segundaId + "/aprovacao/decidir",
                "{\"decisao\":\"CHANGES_REQUESTED\",\"comentario\":\"Rever cotas\"}",
                owner.token()));
        assertThat(alteracoes.path("aprovacao_status").stringValue()).isEqualTo("CHANGES_REQUESTED");
        assertThat(alteracoes.path("aprovacao_comentario").stringValue()).isEqualTo("Rever cotas");
        assertThat(alteracoes.path("revisao_aprovada").intValue()).isEqualTo(1);

        Integer eventos = jdbc.queryForObject("""
                select count(*) from historico
                where obra_id = ?
                  and acao in ('APROVACAO_SOLICITADA', 'REVISAO_APROVADA', 'ALTERACOES_SOLICITADAS')
                """, Integer.class, UUID.fromString(obraId));
        assertThat(eventos).isEqualTo(4);
    }

    @Test
    void pesquisaArquivosPorNomeEmTodasAsCategorias() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Pesquisa", "owner-pesquisa-arquivo@example.com");
        String obraId = criarObra(owner, "Obra pesquisa arquivos").path("id").stringValue();
        byte[] pdf = "%PDF-1.4\nconteudo".getBytes(StandardCharsets.UTF_8);
        byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 1, 2, 3};

        assertThat(upload(obraId, "PROJETO", "Projeto Estrutural.pdf", "application/pdf", pdf, owner.token()).statusCode())
                .isEqualTo(201);
        assertThat(upload(obraId, "FOTO", "fachada.jpg", "image/jpeg", jpeg, owner.token()).statusCode())
                .isEqualTo(201);

        JsonNode resultado = json(get("/v1/obras/" + obraId + "/arquivos?busca=estrutural", owner.token()));
        assertThat(resultado.size()).isEqualTo(1);
        assertThat(resultado.get(0).path("nome_original").stringValue()).isEqualTo("Projeto Estrutural.pdf");
        assertThat(resultado.get(0).path("tipo").stringValue()).isEqualTo("PROJETO");
    }

    @Test
    void respeitaPapeisParaUploadLeituraEDownloadSemUltrapassarLimiteDeColaboradores() throws Exception {
        UsuarioAutenticado owner = registrar("Owner Acesso", "owner-acesso-arquivo@example.com");
        UsuarioAutenticado colaborador = registrar("Colaborador Acesso", "colaborador-acesso-arquivo@example.com");
        JsonNode obra = criarObra(owner, "Obra acesso arquivos");
        String obraId = obra.path("id").stringValue();
        String codigo = obra.path("codigo_compartilhamento").stringValue();

        HttpResponse<String> entrada = post(
                "/v1/obras/entrar",
                "{\"codigo\":\"" + codigo + "\"}",
                colaborador.token());
        assertThat(entrada.statusCode()).isEqualTo(200);

        byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 1, 2, 3};
        assertThat(upload(
                obraId, "FOTO", "bloqueado.jpg", "image/jpeg", jpeg, colaborador.token()).statusCode())
                .isEqualTo(403);

        JsonNode permissoes = json(get("/v1/obras/" + obraId + "/permissoes", owner.token()));
        String colaboradorPermissaoId = null;
        for (JsonNode permissao : permissoes) {
            if (colaborador.email().equals(
                    permissao.path("profiles").path("email").stringValue())) {
                assertThat(permissao.path("papel").stringValue()).isEqualTo("VIEWER");
                colaboradorPermissaoId = permissao.path("id").stringValue();
                break;
            }
        }
        assertThat(colaboradorPermissaoId).isNotNull();

        HttpResponse<String> promocao = patch(
                "/v1/obras/" + obraId + "/permissoes/" + colaboradorPermissaoId,
                "{\"papel\":\"EDITOR\"}",
                owner.token());
        assertThat(promocao.statusCode()).isEqualTo(200);

        HttpResponse<String> editorUpload = upload(
                obraId, "FOTO", "foto.jpg", "image/jpeg", jpeg, colaborador.token());
        assertThat(editorUpload.statusCode()).isEqualTo(201);
        String arquivoId = json(editorUpload).path("id").stringValue();

        HttpResponse<String> alteracao = patch(
                "/v1/obras/" + obraId + "/permissoes/" + colaboradorPermissaoId,
                "{\"papel\":\"VIEWER\"}",
                owner.token());
        assertThat(alteracao.statusCode()).isEqualTo(200);

        assertThat(json(get("/v1/obras/" + obraId + "/arquivos", colaborador.token())).size()).isEqualTo(1);
        assertThat(get("/v1/arquivos/" + arquivoId + "/download-url", colaborador.token()).statusCode())
                .isEqualTo(200);
        assertThat(upload(
                obraId, "FOTO", "bloqueado.jpg", "image/jpeg", jpeg, colaborador.token()).statusCode())
                .isEqualTo(403);
        assertThat(patch(
                "/v1/arquivos/" + arquivoId,
                "{\"nome\":\"bloqueado.jpg\"}",
                colaborador.token()).statusCode())
                .isEqualTo(403);
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
        return uploadMultipart(
                "/v1/obras/" + obraId + "/arquivos?tipo=" + tipo,
                nome,
                contentType,
                conteudo,
                token);
    }

    private int contarNotificacoes(String email, String acao) {
        return jdbc.queryForObject("""
                select count(*)
                from notificacoes n
                join usuarios u on u.id = n.usuario_id
                join historico h on h.id = n.historico_id
                where u.email = ? and h.acao = ?
                """, Integer.class, email, acao);
    }

    private HttpResponse<String> uploadRevisao(
            String arquivoId,
            String nome,
            String contentType,
            byte[] conteudo,
            String token) throws Exception {
        return uploadMultipart(
                "/v1/arquivos/" + arquivoId + "/revisoes",
                nome,
                contentType,
                conteudo,
                token);
    }

    private HttpResponse<String> uploadMultipart(
            String path,
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

        HttpRequest request = HttpRequest.newBuilder(uri(path))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode criarObra(UsuarioAutenticado usuario, String nome) throws Exception {
        return json(post("/v1/obras", "{\"nome\":\"" + nome + "\"}", usuario.token()));
    }

    private UsuarioAutenticado registrar(String nome, String email) throws Exception {
        JsonNode response = json(post(
                "/auth/register",
                "{\"nome\":\"" + nome + "\",\"email\":\"" + email
                        + "\",\"senha\":\"Senha123\",\"aceitou_termos\":true}",
                null));
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
