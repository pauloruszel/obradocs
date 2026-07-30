package br.com.obradocs.migration;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.*;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static br.com.obradocs.migration.MigrationBundle.*;

final class RailwayImporter implements AutoCloseable {

    private final ImportConfig config;
    private final ObjectMapper json;
    private final S3Client storage;

    RailwayImporter(ImportConfig config, ObjectMapper json) {
        this.config = config;
        this.json = json;
        this.storage = S3Client.builder().endpointOverride(config.storageEndpoint()).region(Region.of(config.storageRegion())).credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(config.storageAccessKey(), config.storageSecretKey()))).serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled("path".equalsIgnoreCase(config.storageUrlStyle())).build()).httpClientBuilder(UrlConnectionHttpClient.builder()).build();
    }

    MigrationResult importBundle(MigrationBundle bundle) throws IOException, SQLException {
        bundle.validate();
        validateLocalFiles(bundle);

        try (Connection connection = connection()) {
            assertSchemaReady(connection);
            long existing = domainRowCount(connection);
            if (existing != 0) {
                validateDatabase(connection, bundle);
            }
            uploadFiles(bundle);
            if (existing == 0) {
                insertAll(connection, bundle);
            }
            validateDatabase(connection, bundle);
        }
        validateStorage(bundle);
        return MigrationResult.from(bundle);
    }

    MigrationResult validate(MigrationBundle bundle) throws IOException, SQLException {
        bundle.validate();
        validateLocalFiles(bundle);
        try (Connection connection = connection()) {
            assertSchemaReady(connection);
            validateDatabase(connection, bundle);
        }
        validateStorage(bundle);
        return MigrationResult.from(bundle);
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(config.jdbcUrl(), config.databaseUser(), config.databasePassword());
    }

    private void insertAll(Connection connection, MigrationBundle bundle) throws SQLException {
        connection.setAutoCommit(false);
        try {
            insertUsers(connection, bundle.users());
            insertObras(connection, bundle.obras());
            insertPermissoes(connection, bundle.permissoes());
            insertDocumentos(connection, bundle.arquivos());
            insertArquivos(connection, bundle.arquivos());
            insertHistorico(connection, bundle.historico());
            connection.commit();
        } catch (Exception exception) {
            connection.rollback();
            if (exception instanceof SQLException sqlException) {
                throw sqlException;
            }
            throw exception;
        } finally {
            connection.setAutoCommit(true);
        }
    }

    private void insertUsers(Connection connection, List<UserData> users) throws SQLException {
        String unusablePassword = new BCryptPasswordEncoder(12).encode(UUID.randomUUID().toString());
        try (PreparedStatement statement = connection.prepareStatement("""
                insert into usuarios (
                    id, nome, email, senha_hash, ativo, password_change_required, created_at, updated_at
                ) values (?, ?, ?, ?, ?, true, ?, ?)
                """)) {
            for (UserData user : users) {
                statement.setObject(1, user.id());
                statement.setString(2, user.nome());
                statement.setString(3, user.email());
                statement.setString(4, unusablePassword);
                statement.setBoolean(5, user.ativo());
                setInstant(statement, 6, user.createdAt());
                setInstant(statement, 7, user.createdAt());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private void insertObras(Connection connection, List<ObraData> obras) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                insert into obras (
                    id, nome, codigo_compartilhamento, created_by, deleted_at, deleted_by, created_at
                ) values (?, ?, ?, ?, ?, ?, ?)
                """)) {
            for (ObraData obra : obras) {
                statement.setObject(1, obra.id());
                statement.setString(2, obra.nome());
                statement.setString(3, obra.codigoCompartilhamento());
                statement.setObject(4, obra.createdBy());
                setNullableInstant(statement, 5, obra.deletedAt());
                statement.setObject(6, obra.deletedBy());
                setInstant(statement, 7, obra.createdAt());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private void insertPermissoes(Connection connection, List<PermissaoData> permissoes) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                insert into permissoes (id, obra_id, user_id, papel, created_at)
                values (?, ?, ?, ?, ?)
                """)) {
            for (PermissaoData permissao : permissoes) {
                statement.setObject(1, permissao.id());
                statement.setObject(2, permissao.obraId());
                statement.setObject(3, permissao.userId());
                statement.setString(4, permissao.papel());
                setInstant(statement, 5, permissao.createdAt());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private void insertArquivos(Connection connection, List<ArquivoData> arquivos) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                insert into arquivos (
                    id, obra_id, tipo, nome_original, storage_path, content_type,
                    tamanho_bytes, enviado_por, created_at, documento_id, revisao
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                """)) {
            for (ArquivoData arquivo : arquivos) {
                statement.setObject(1, arquivo.id());
                statement.setObject(2, arquivo.obraId());
                statement.setString(3, arquivo.tipo());
                statement.setString(4, arquivo.nomeOriginal());
                statement.setString(5, arquivo.storagePath());
                statement.setString(6, arquivo.contentType());
                statement.setLong(7, arquivo.tamanhoBytes());
                statement.setObject(8, arquivo.enviadoPor());
                setInstant(statement, 9, arquivo.createdAt());
                statement.setObject(10, arquivo.id());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private void insertDocumentos(Connection connection, List<ArquivoData> arquivos) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                insert into documentos (id, obra_id, tipo, nome, revisao_atual, created_at)
                values (?, ?, ?, ?, 1, ?)
                """)) {
            for (ArquivoData arquivo : arquivos) {
                statement.setObject(1, arquivo.id());
                statement.setObject(2, arquivo.obraId());
                statement.setString(3, arquivo.tipo());
                statement.setString(4, arquivo.nomeOriginal());
                setInstant(statement, 5, arquivo.createdAt());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private void insertHistorico(Connection connection, List<HistoricoData> historico) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                insert into historico (id, obra_id, user_id, acao, detalhes, created_at)
                values (?, ?, ?, ?, ?::jsonb, ?)
                """)) {
            for (HistoricoData item : historico) {
                statement.setObject(1, item.id());
                statement.setObject(2, item.obraId());
                statement.setObject(3, item.userId());
                statement.setString(4, item.acao());
                statement.setString(5, item.detalhes() == null ? null : item.detalhes().toString());
                setInstant(statement, 6, item.createdAt());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private void uploadFiles(MigrationBundle bundle) throws IOException {
        for (ArquivoData arquivo : bundle.arquivos()) {
            Path source = localFile(arquivo.storagePath());
            HeadObjectResponse current = head(arquivo.storagePath());
            if (matches(current, arquivo)) {
                continue;
            }
            storage.putObject(PutObjectRequest.builder().bucket(config.storageBucket()).key(arquivo.storagePath()).contentType(arquivo.contentType()).contentLength(arquivo.tamanhoBytes()).metadata(java.util.Map.of("sha256", arquivo.sha256())).build(), RequestBody.fromFile(source));
        }
    }

    private void validateStorage(MigrationBundle bundle) {
        for (ArquivoData arquivo : bundle.arquivos()) {
            if (!matches(head(arquivo.storagePath()), arquivo)) {
                throw new IllegalStateException("Arquivo divergente no storage de destino: " + arquivo.storagePath());
            }
        }
    }

    private void validateLocalFiles(MigrationBundle bundle) throws IOException {
        for (ArquivoData arquivo : bundle.arquivos()) {
            Path file = localFile(arquivo.storagePath());
            if (!Files.isRegularFile(file)) {
                throw new IllegalStateException("Arquivo exportado ausente: " + arquivo.storagePath());
            }
            if (Files.size(file) != arquivo.tamanhoBytes()) {
                throw new IllegalStateException("Tamanho local divergente: " + arquivo.storagePath());
            }
            if (!sha256(file).equals(arquivo.sha256())) {
                throw new IllegalStateException("SHA-256 local divergente: " + arquivo.storagePath());
            }
        }
    }

    private void validateDatabase(Connection connection, MigrationBundle bundle) throws SQLException {
        assertCount(connection, "usuarios", bundle.users().size());
        assertCount(connection, "obras", bundle.obras().size());
        assertCount(connection, "permissoes", bundle.permissoes().size());
        assertCount(connection, "documentos", bundle.arquivos().size());
        assertCount(connection, "arquivos", bundle.arquivos().size());
        assertCount(connection, "historico", bundle.historico().size());

        // ponytail: uma consulta por UUID e suficiente para a migracao atual; usar fingerprints em lote se o volume crescer.
        for (UserData user : bundle.users()) {
            check(connection, """
                    select nome, email, ativo, password_change_required, created_at
                    from usuarios where id = ?
                    """, user.id(), row -> {
                requireEqual(user.nome(), row.getString("nome"), "nome do usuario " + user.id());
                requireEqual(user.email(), row.getString("email"), "e-mail do usuario " + user.id());
                require(user.ativo() == row.getBoolean("ativo"), "Estado ativo divergente: " + user.id());
                require(row.getBoolean("password_change_required"), "Troca de senha nao exigida: " + user.id());
                requireInstant(user.createdAt(), instant(row, "created_at"), "created_at do usuario " + user.id());
            });
        }
        for (ObraData obra : bundle.obras()) {
            check(connection, """
                    select nome, codigo_compartilhamento, created_by, deleted_at, deleted_by, created_at
                    from obras where id = ?
                    """, obra.id(), row -> {
                requireEqual(obra.nome(), row.getString("nome"), "nome da obra " + obra.id());
                requireEqual(obra.codigoCompartilhamento(), row.getString("codigo_compartilhamento"), "codigo da obra " + obra.id());
                requireEqual(obra.createdBy(), row.getObject("created_by", UUID.class), "criador da obra " + obra.id());
                requireInstant(obra.deletedAt(), instant(row, "deleted_at"), "deleted_at da obra " + obra.id());
                requireEqual(obra.deletedBy(), row.getObject("deleted_by", UUID.class), "deleted_by da obra " + obra.id());
                requireInstant(obra.createdAt(), instant(row, "created_at"), "created_at da obra " + obra.id());
            });
        }
        for (PermissaoData permissao : bundle.permissoes()) {
            check(connection, """
                    select obra_id, user_id, papel, created_at from permissoes where id = ?
                    """, permissao.id(), row -> {
                requireEqual(permissao.obraId(), row.getObject("obra_id", UUID.class), "obra da permissao " + permissao.id());
                requireEqual(permissao.userId(), row.getObject("user_id", UUID.class), "usuario da permissao " + permissao.id());
                requireEqual(permissao.papel(), row.getString("papel"), "papel " + permissao.id());
                requireInstant(permissao.createdAt(), instant(row, "created_at"), "created_at da permissao " + permissao.id());
            });
        }
        for (ArquivoData arquivo : bundle.arquivos()) {
            check(connection, """
                    select obra_id, tipo, nome_original, storage_path, content_type,
                           tamanho_bytes, enviado_por, created_at, documento_id, revisao
                    from arquivos where id = ?
                    """, arquivo.id(), row -> {
                requireEqual(arquivo.obraId(), row.getObject("obra_id", UUID.class), "obra do arquivo " + arquivo.id());
                requireEqual(arquivo.tipo(), row.getString("tipo"), "tipo do arquivo " + arquivo.id());
                requireEqual(arquivo.nomeOriginal(), row.getString("nome_original"), "nome do arquivo " + arquivo.id());
                requireEqual(arquivo.storagePath(), row.getString("storage_path"), "path do arquivo " + arquivo.id());
                requireEqual(arquivo.contentType(), row.getString("content_type"), "content_type do arquivo " + arquivo.id());
                require(arquivo.tamanhoBytes() == row.getLong("tamanho_bytes"), "Tamanho divergente no arquivo " + arquivo.id());
                requireEqual(arquivo.enviadoPor(), row.getObject("enviado_por", UUID.class), "enviado_por do arquivo " + arquivo.id());
                requireInstant(arquivo.createdAt(), instant(row, "created_at"), "created_at do arquivo " + arquivo.id());
                requireEqual(arquivo.id(), row.getObject("documento_id", UUID.class), "documento do arquivo " + arquivo.id());
                require(row.getInt("revisao") == 1, "Revisao inicial divergente no arquivo " + arquivo.id());
            });
        }
        for (HistoricoData item : bundle.historico()) {
            check(connection, """
                    select obra_id, user_id, acao, detalhes, created_at from historico where id = ?
                    """, item.id(), row -> {
                requireEqual(item.obraId(), row.getObject("obra_id", UUID.class), "obra do historico " + item.id());
                requireEqual(item.userId(), row.getObject("user_id", UUID.class), "usuario do historico " + item.id());
                requireEqual(item.acao(), row.getString("acao"), "acao do historico " + item.id());
                String details = row.getString("detalhes");
                JsonNode targetDetails = details == null ? null : json.readTree(details);
                requireEqual(item.detalhes(), targetDetails, "detalhes do historico " + item.id());
                requireInstant(item.createdAt(), instant(row, "created_at"), "created_at do historico " + item.id());
            });
        }
    }

    private static void assertSchemaReady(Connection connection) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                select u.password_change_required
                from usuarios u
                join documentos d on false
                join arquivos a on a.documento_id = d.id
                where false
                """)) {
            statement.executeQuery();
        } catch (SQLException exception) {
            throw new IllegalStateException("Schema de destino desatualizado; execute as migracoes Flyway ate V13", exception);
        }
    }

    private static long domainRowCount(Connection connection) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                select
                    (select count(*) from usuarios)
                  + (select count(*) from obras)
                  + (select count(*) from permissoes)
                  + (select count(*) from documentos)
                  + (select count(*) from arquivos)
                  + (select count(*) from historico)
                """); ResultSet result = statement.executeQuery()) {
            result.next();
            return result.getLong(1);
        }
    }

    private static void assertCount(Connection connection, String table, int expected) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("select count(*) from " + table); ResultSet result = statement.executeQuery()) {
            result.next();
            long actual = result.getLong(1);
            require(actual == expected, "Contagem divergente em " + table + ": esperado " + expected + ", encontrado " + actual);
        }
    }

    private static void check(Connection connection, String sql, UUID id, RowCheck check) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, id);
            try (ResultSet result = statement.executeQuery()) {
                require(result.next(), "Registro ausente: " + id);
                check.accept(result);
                require(!result.next(), "Registro duplicado: " + id);
            }
        }
    }

    private HeadObjectResponse head(String key) {
        try {
            return storage.headObject(HeadObjectRequest.builder().bucket(config.storageBucket()).key(key).build());
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                return null;
            }
            throw exception;
        }
    }

    private static boolean matches(HeadObjectResponse head, ArquivoData arquivo) {
        return head != null && head.contentLength() == arquivo.tamanhoBytes() && arquivo.sha256().equals(head.metadata().get("sha256")) && arquivo.contentType().equalsIgnoreCase(head.contentType());
    }

    private Path localFile(String storagePath) {
        Path root = config.directory().resolve("files").toAbsolutePath().normalize();
        Path file = root.resolve(storagePath.replace('/', java.io.File.separatorChar)).normalize();
        if (!file.startsWith(root)) {
            throw new IllegalStateException("Caminho de storage inseguro: " + storagePath);
        }
        return file;
    }

    private static String sha256(Path file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (var input = Files.newInputStream(file); var digestInput = new java.security.DigestInputStream(input, digest)) {
                digestInput.transferTo(java.io.OutputStream.nullOutputStream());
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponivel", exception);
        }
    }

    private static void setInstant(PreparedStatement statement, int index, Instant value) throws SQLException {
        statement.setObject(index, value.atOffset(ZoneOffset.UTC));
    }

    private static void setNullableInstant(PreparedStatement statement, int index, Instant value) throws SQLException {
        if (value == null) {
            statement.setObject(index, null);
        } else {
            setInstant(statement, index, value);
        }
    }

    private static Instant instant(ResultSet row, String column) throws SQLException {
        OffsetDateTime value = row.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }

    private static void requireInstant(Instant expected, Instant actual, String label) {
        Instant normalizedExpected = expected == null ? null : expected.truncatedTo(ChronoUnit.MICROS);
        Instant normalizedActual = actual == null ? null : actual.truncatedTo(ChronoUnit.MICROS);
        requireEqual(normalizedExpected, normalizedActual, label);
    }

    private static void requireEqual(Object expected, Object actual, String label) {
        require(Objects.equals(expected, actual), "Valor divergente em " + label + ": esperado " + expected + ", encontrado " + actual);
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }

    @Override
    public void close() {
        storage.close();
    }

    record ImportConfig(String jdbcUrl, String databaseUser, String databasePassword, URI storageEndpoint,
                        String storageAccessKey, String storageSecretKey, String storageBucket, String storageRegion,
                        String storageUrlStyle, Path directory) {

        ImportConfig {
            requireText(jdbcUrl, "JDBC_DATABASE_URL");
            requireText(databaseUser, "PGUSER");
            requireText(databasePassword, "PGPASSWORD");
            Objects.requireNonNull(storageEndpoint, "AWS_ENDPOINT_URL");
            requireText(storageAccessKey, "AWS_ACCESS_KEY_ID");
            requireText(storageSecretKey, "AWS_SECRET_ACCESS_KEY");
            requireText(storageBucket, "AWS_S3_BUCKET_NAME");
            requireText(storageRegion, "AWS_DEFAULT_REGION");
            if (!"virtual".equalsIgnoreCase(storageUrlStyle) && !"path".equalsIgnoreCase(storageUrlStyle)) {
                throw new IllegalStateException("AWS_S3_URL_STYLE deve ser virtual ou path");
            }
            directory = directory.toAbsolutePath().normalize();
        }

        private static void requireText(String value, String name) {
            if (value == null || value.isBlank()) {
                throw new IllegalStateException(name + " nao configurada");
            }
        }
    }

    record MigrationResult(int users, int obras, int permissoes, int arquivos, int historico) {
        static MigrationResult from(MigrationBundle bundle) {
            return new MigrationResult(bundle.users().size(), bundle.obras().size(), bundle.permissoes().size(), bundle.arquivos().size(), bundle.historico().size());
        }
    }

    @FunctionalInterface
    private interface RowCheck {
        void accept(ResultSet row) throws SQLException;
    }
}
