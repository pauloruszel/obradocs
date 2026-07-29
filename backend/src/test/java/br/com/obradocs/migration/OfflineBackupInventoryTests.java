package br.com.obradocs.migration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OfflineBackupInventoryTests {

    @TempDir
    Path directory;

    @Test
    void inventariaBackupEIdentificaMetadadosAusentes() throws Exception {
        UUID obraId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        Path obra = Files.createDirectories(directory.resolve("obras-files").resolve(obraId.toString()));
        Files.write(obra.resolve("1763918169712-foto.jpg"), new byte[]{1, 2, 3});
        Files.write(obra.resolve("1763918169713-documento.pdf"), "%PDF-1.4".getBytes(StandardCharsets.UTF_8));

        OfflineBackupInventory.Inventory inventory = OfflineBackupInventory.scan(directory);

        assertThat(inventory.obras()).singleElement().satisfies(item -> {
            assertThat(item.id()).isEqualTo(obraId);
            assertThat(item.metadadosAusentes()).containsExactly("nome", "codigo_compartilhamento", "owner_email");
            assertThat(item.files()).hasSize(2);
            assertThat(item.files()).anySatisfy(file -> {
                assertThat(file.tipoInferido()).isEqualTo("FOTO");
                assertThat(file.tipoRequerConfirmacao()).isFalse();
                assertThat(file.createdAt()).isEqualTo(Instant.ofEpochMilli(1763918169712L));
            });
            assertThat(item.files()).anySatisfy(file -> {
                assertThat(file.tipoInferido()).isNull();
                assertThat(file.tipoRequerConfirmacao()).isTrue();
            });
        });
        assertThat(inventory.fileCount()).isEqualTo(2);
        assertThat(inventory.filesRequiringReview()).isEqualTo(1);
    }
}
