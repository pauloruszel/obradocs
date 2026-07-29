package br.com.obradocs.migration;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Stream;

final class OfflineBackupInventory {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    private OfflineBackupInventory() {
    }

    static Inventory scan(Path backupDirectory) throws IOException {
        Path root = backupDirectory.toAbsolutePath().normalize();
        Path bucket = Files.isDirectory(root.resolve("obras-files")) ? root.resolve("obras-files") : root;
        if (!Files.isDirectory(bucket)) {
            throw new IllegalStateException("Diretorio do backup de storage nao encontrado: " + bucket);
        }

        List<ObraInventory> obras;
        try (Stream<Path> directories = Files.list(bucket)) {
            obras = directories.filter(Files::isDirectory).sorted().map(directory -> scanObra(bucket, directory)).toList();
        }
        if (obras.isEmpty()) {
            throw new IllegalStateException("Nenhuma obra encontrada no backup: " + bucket);
        }
        return new Inventory(1, Instant.now(), bucket.toString(), obras);
    }

    private static ObraInventory scanObra(Path bucket, Path directory) {
        UUID obraId;
        try {
            obraId = UUID.fromString(directory.getFileName().toString());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("Diretorio de obra invalido: " + directory.getFileName(), exception);
        }

        try (Stream<Path> paths = Files.walk(directory)) {
            List<FileInventory> files = paths.filter(Files::isRegularFile).sorted().map(path -> scanFile(bucket, obraId, path)).toList();
            return new ObraInventory(obraId, null, null, null, List.of("nome", "codigo_compartilhamento", "owner_email"), files);
        } catch (IOException exception) {
            throw new IllegalStateException("Falha ao ler obra " + obraId, exception);
        }
    }

    private static FileInventory scanFile(Path bucket, UUID obraId, Path file) {
        try {
            String storagePath = bucket.relativize(file).toString().replace(java.io.File.separatorChar, '/');
            String fileName = file.getFileName().toString();
            String originalName = fileName.replaceFirst("^\\d{10,}-", "");
            long size = Files.size(file);
            if (size <= 0 || size > MAX_FILE_SIZE) {
                throw new IllegalStateException("Tamanho fora do limite para " + storagePath + ": " + size);
            }

            String contentType = contentType(fileName);
            String inferredType = inferType(fileName);
            return new FileInventory(UUID.nameUUIDFromBytes(("obradocs-recovery:" + storagePath).getBytes(StandardCharsets.UTF_8)), obraId, storagePath, originalName, inferredType, inferredType == null, contentType, size, sha256(file), createdAt(fileName, file));
        } catch (IOException exception) {
            throw new IllegalStateException("Falha ao inventariar arquivo " + file, exception);
        }
    }

    private static String inferType(String fileName) {
        String normalized = fileName.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        if (normalized.endsWith("JPG") || normalized.endsWith("JPEG")) {
            return "FOTO";
        }
        if (normalized.contains("ORCAMENTO")) {
            return "ORCAMENTO";
        }
        if (normalized.contains("NOTAFISCAL")) {
            return "NOTA_FISCAL";
        }
        if (normalized.contains("PROJETO")) {
            return "PROJETO";
        }
        return null;
    }

    private static String contentType(String fileName) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        throw new IllegalStateException("Formato nao suportado no backup: " + fileName);
    }

    private static Instant createdAt(String fileName, Path file) throws IOException {
        String prefix = fileName.split("-", 2)[0];
        try {
            return Instant.ofEpochMilli(Long.parseLong(prefix));
        } catch (NumberFormatException exception) {
            return Files.getLastModifiedTime(file).toInstant();
        }
    }

    private static String sha256(Path file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (var input = Files.newInputStream(file); var digestInput = new DigestInputStream(input, digest)) {
                digestInput.transferTo(java.io.OutputStream.nullOutputStream());
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponivel", exception);
        }
    }

    record Inventory(int version, Instant scannedAt, String bucketDirectory, List<ObraInventory> obras) {
        int fileCount() {
            return obras.stream().mapToInt(item -> item.files().size()).sum();
        }

        long totalBytes() {
            return obras.stream().flatMap(item -> item.files().stream()).mapToLong(FileInventory::tamanhoBytes).sum();
        }

        long filesRequiringReview() {
            return obras.stream().flatMap(item -> item.files().stream()).filter(FileInventory::tipoRequerConfirmacao).count();
        }
    }

    record ObraInventory(UUID id, String nome, String codigoCompartilhamento, String ownerEmail,
                         List<String> metadadosAusentes, List<FileInventory> files) {
    }

    record FileInventory(UUID suggestedId, UUID obraId, String storagePath, String nomeOriginal, String tipoInferido,
                         boolean tipoRequerConfirmacao, String contentType, long tamanhoBytes, String sha256,
                         Instant createdAt) {
    }
}
