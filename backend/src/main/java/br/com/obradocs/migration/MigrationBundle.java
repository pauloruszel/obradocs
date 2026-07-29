package br.com.obradocs.migration;

import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

record MigrationBundle(int version, Instant exportedAt, String sourceBucket, List<UserData> users, List<ObraData> obras,
                       List<PermissaoData> permissoes, List<ArquivoData> arquivos, List<HistoricoData> historico) {

    static final int CURRENT_VERSION = 1;
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> FILE_TYPES = Set.of("ORCAMENTO", "NOTA_FISCAL", "PROJETO", "FOTO");
    private static final Set<String> CONTENT_TYPES = Set.of("application/pdf", "image/jpeg");
    private static final Set<String> ROLES = Set.of("OWNER", "EDITOR", "VIEWER");

    void validate() {
        require(version == CURRENT_VERSION, "Versao de manifesto nao suportada: " + version);
        require(exportedAt != null, "Data de exportacao ausente");
        require(notBlank(sourceBucket), "Bucket de origem ausente");
        require(users != null && obras != null && permissoes != null && arquivos != null && historico != null, "Colecao ausente no manifesto");

        Set<UUID> userIds = unique(users, UserData::id, "usuarios");
        Set<UUID> obraIds = unique(obras, ObraData::id, "obras");
        unique(permissoes, PermissaoData::id, "permissoes");
        unique(arquivos, ArquivoData::id, "arquivos");
        unique(historico, HistoricoData::id, "historico");
        unique(users, UserData::email, "e-mails");
        unique(obras, ObraData::codigoCompartilhamento, "codigos de compartilhamento");
        unique(arquivos, ArquivoData::storagePath, "caminhos de arquivos");
        unique(permissoes, item -> item.obraId() + ":" + item.userId(), "pares de obra e usuario em permissoes");

        for (UserData user : users) {
            require(notBlank(user.nome()), "Usuario sem nome: " + user.id());
            requireLength(user.nome(), 150, "nome do usuario " + user.id());
            require(notBlank(user.email()) && user.email().equals(user.email().toLowerCase()), "E-mail invalido: " + user.id());
            requireLength(user.email(), 320, "e-mail do usuario " + user.id());
            require(user.createdAt() != null, "Usuario sem created_at: " + user.id());
        }
        for (ObraData obra : obras) {
            require(notBlank(obra.nome()), "Obra sem nome: " + obra.id());
            requireLength(obra.nome(), 200, "nome da obra " + obra.id());
            require(obra.codigoCompartilhamento() != null && obra.codigoCompartilhamento().matches("^[A-Z0-9]{4}-[A-Z0-9]{4}$"), "Codigo de compartilhamento invalido: " + obra.id());
            require(userIds.contains(obra.createdBy()), "Criador de obra ausente: " + obra.id());
            require(obra.deletedBy() == null || userIds.contains(obra.deletedBy()), "Usuario de exclusao ausente: " + obra.id());
            require(obra.createdAt() != null, "Obra sem created_at: " + obra.id());
        }
        for (PermissaoData permissao : permissoes) {
            require(obraIds.contains(permissao.obraId()), "Obra de permissao ausente: " + permissao.id());
            require(userIds.contains(permissao.userId()), "Usuario de permissao ausente: " + permissao.id());
            require(ROLES.contains(permissao.papel()), "Papel invalido: " + permissao.id());
            require(permissao.createdAt() != null, "Permissao sem created_at: " + permissao.id());
        }
        for (ObraData obra : obras) {
            long owners = permissoes.stream().filter(item -> item.obraId().equals(obra.id()) && "OWNER".equals(item.papel())).count();
            require(owners >= 1, "Obra deve ter ao menos um OWNER: " + obra.id());
        }
        for (ArquivoData arquivo : arquivos) {
            require(obraIds.contains(arquivo.obraId()), "Obra de arquivo ausente: " + arquivo.id());
            require(arquivo.enviadoPor() == null || userIds.contains(arquivo.enviadoPor()), "Usuario de arquivo ausente: " + arquivo.id());
            require(FILE_TYPES.contains(arquivo.tipo()), "Tipo de arquivo invalido: " + arquivo.id());
            require(notBlank(arquivo.nomeOriginal()), "Arquivo sem nome: " + arquivo.id());
            requireLength(arquivo.nomeOriginal(), 255, "nome do arquivo " + arquivo.id());
            require(safeStoragePath(arquivo.storagePath()), "Caminho de arquivo inseguro: " + arquivo.id());
            requireLength(arquivo.storagePath(), 700, "caminho do arquivo " + arquivo.id());
            require(CONTENT_TYPES.contains(arquivo.contentType()), "Content-Type de arquivo invalido: " + arquivo.id());
            require(arquivo.tamanhoBytes() > 0 && arquivo.tamanhoBytes() <= MAX_FILE_SIZE, "Tamanho de arquivo invalido: " + arquivo.id());
            require(arquivo.sha256() != null && arquivo.sha256().matches("^[a-f0-9]{64}$"), "SHA-256 de arquivo invalido: " + arquivo.id());
            require(arquivo.createdAt() != null, "Arquivo sem created_at: " + arquivo.id());
        }
        for (HistoricoData item : historico) {
            require(obraIds.contains(item.obraId()), "Obra de historico ausente: " + item.id());
            require(item.userId() == null || userIds.contains(item.userId()), "Usuario de historico ausente: " + item.id());
            require(notBlank(item.acao()), "Historico sem acao: " + item.id());
            requireLength(item.acao(), 50, "acao do historico " + item.id());
            require(item.createdAt() != null, "Historico sem created_at: " + item.id());
        }
    }

    private static boolean safeStoragePath(String path) {
        return notBlank(path) && !path.contains("\\") && !path.startsWith("/") && !path.contains("../") && java.util.Arrays.stream(path.split("/")).noneMatch(".."::equals);
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static void requireLength(String value, int maximum, String label) {
        require(value.length() <= maximum, "Valor excede " + maximum + " caracteres em " + label);
    }

    private static <T, K> Set<K> unique(List<T> values, Function<T, K> key, String label) {
        Set<K> result = new HashSet<>();
        for (T value : values) {
            K item = key.apply(value);
            require(item != null && result.add(item), "Duplicidade em " + label + ": " + item);
        }
        return result;
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }

    record UserData(UUID id, String nome, String email, boolean ativo, Instant createdAt) {
    }

    record ObraData(UUID id, String nome, String codigoCompartilhamento, UUID createdBy, Instant deletedAt,
                    UUID deletedBy, Instant createdAt) {
    }

    record PermissaoData(UUID id, UUID obraId, UUID userId, String papel, Instant createdAt) {
    }

    record ArquivoData(UUID id, UUID obraId, String tipo, String nomeOriginal, String storagePath, String contentType,
                       long tamanhoBytes, String sha256, UUID enviadoPor, Instant createdAt) {
    }

    record HistoricoData(UUID id, UUID obraId, UUID userId, String acao, JsonNode detalhes, Instant createdAt) {
    }
}
