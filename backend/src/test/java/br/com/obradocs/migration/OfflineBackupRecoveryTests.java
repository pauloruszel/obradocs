package br.com.obradocs.migration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class OfflineBackupRecoveryTests {

    @TempDir
    Path directory;

    @Test
    void combinaDadosComStorageECorrigeCriadorSemOwner() throws Exception {
        Path obra = Files.createDirectories(directory.resolve("backup/obras-files/11111111-1111-1111-1111-111111111111"));
        Files.write(obra.resolve("1763918169712-foto.jpg"), new byte[]{1, 2, 3});
        Files.write(obra.resolve("1763918169713-orphan.jpg"), new byte[]{4});
        Path data = directory.resolve("data.json");
        Files.writeString(data, """
                {
                  "users": [{
                    "id": "22222222-2222-2222-2222-222222222222",
                    "email": "user@example.com",
                    "ativo": true,
                    "created_at": "2025-11-21T00:00:00Z",
                    "raw_user_meta_data": {"nome": "Fallback"}
                  }],
                  "profiles": [{
                    "id": "22222222-2222-2222-2222-222222222222",
                    "nome": "Usuario",
                    "email": "user@example.com"
                  }],
                  "obras": [{
                    "id": "11111111-1111-1111-1111-111111111111",
                    "nome": "Obra",
                    "codigo_compartilhamento": "ABCD-1234",
                    "created_by": "22222222-2222-2222-2222-222222222222",
                    "deleted_at": null,
                    "deleted_by": null,
                    "created_at": "2025-11-21T00:00:00Z"
                  }],
                  "permissoes": [{
                    "id": "33333333-3333-3333-3333-333333333333",
                    "obra_id": "11111111-1111-1111-1111-111111111111",
                    "user_id": "22222222-2222-2222-2222-222222222222",
                    "papel": "EDITOR",
                    "created_at": "2025-11-21T00:00:00Z"
                  }],
                  "arquivos": [{
                    "id": "44444444-4444-4444-4444-444444444444",
                    "obra_id": "11111111-1111-1111-1111-111111111111",
                    "tipo": "FOTO",
                    "nome_original": "foto.jpg",
                    "storage_path": "11111111-1111-1111-1111-111111111111/1763918169712-foto.jpg",
                    "enviado_por": "22222222-2222-2222-2222-222222222222",
                    "created_at": "2025-11-21T00:00:00Z"
                  }],
                  "historico": []
                }
                """, StandardCharsets.UTF_8);

        OfflineBackupRecovery.RecoveryResult result = OfflineBackupRecovery.recover(data, directory.resolve("backup"), directory.resolve("output"), JsonMapper.builder().findAndAddModules().build());

        assertThat(result.repairedOwners()).isEqualTo(1);
        assertThat(result.bundle().permissoes()).singleElement().extracting(MigrationBundle.PermissaoData::papel).isEqualTo("OWNER");
        assertThat(result.orphanFiles()).containsExactly("11111111-1111-1111-1111-111111111111/1763918169713-orphan.jpg");
        assertThat(directory.resolve("output/files/11111111-1111-1111-1111-111111111111/1763918169712-foto.jpg")).exists();
    }
}
