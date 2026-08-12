package br.com.obradocs.api.arquivo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

@ExtendWith(MockitoExtension.class)
class S3StorageTests {

    @Mock
    private S3Client client;

    @Mock
    private S3Presigner presigner;

    @Mock
    private MultipartFile multipart;

    @Mock
    private PresignedGetObjectRequest presignedRequest;

    @Test
    void enviaPorStreamSemCarregarArquivoInteiroNaMemoria() throws Exception {
        byte[] conteudo = "conteudo".getBytes();
        when(multipart.getSize()).thenReturn((long) conteudo.length);
        when(multipart.getInputStream()).thenReturn(new ByteArrayInputStream(conteudo));
        S3Storage storage = new S3Storage(client, presigner, properties());

        storage.armazenar("obra/arquivo", multipart, "application/pdf");

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(client).putObject(request.capture(), any(RequestBody.class));
        verify(multipart).getInputStream();
        verify(multipart, never()).getBytes();
        assertThat(request.getValue().bucket()).isEqualTo("bucket-privado");
        assertThat(request.getValue().key()).isEqualTo("obra/arquivo");
        assertThat(request.getValue().contentLength()).isEqualTo(conteudo.length);
        assertThat(request.getValue().acl()).isNull();
    }

    @Test
    void geraSomenteUrlTemporariaParaDownloadPrivado() throws Exception {
        URL url = URI.create("https://storage.example.com/download-assinado").toURL();
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presignedRequest);
        when(presignedRequest.url()).thenReturn(url);
        S3Storage storage = new S3Storage(client, presigner, properties());
        Instant antes = Instant.now().plus(Duration.ofMinutes(59));

        S3Storage.DownloadTemporario download = storage.criarDownload("obra/arquivo", "application/pdf");

        ArgumentCaptor<GetObjectPresignRequest> request = ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        verify(presigner).presignGetObject(request.capture());
        assertThat(request.getValue().signatureDuration()).isEqualTo(Duration.ofHours(1));
        assertThat(request.getValue().getObjectRequest().bucket()).isEqualTo("bucket-privado");
        assertThat(request.getValue().getObjectRequest().key()).isEqualTo("obra/arquivo");
        assertThat(download.url()).isEqualTo(url.toURI());
        assertThat(download.expiresAt()).isAfter(antes);
    }

    @Test
    void falhaAoExcluirObjetoNaoInterrompeCompensacao() {
        doThrow(new IllegalStateException("storage indisponivel"))
                .when(client).deleteObject(any(DeleteObjectRequest.class));
        S3Storage storage = new S3Storage(client, presigner, properties());

        assertThatCode(() -> storage.excluirSilenciosamente("obra/arquivo"))
                .doesNotThrowAnyException();
    }

    private StorageConfig.StorageProperties properties() {
        return new StorageConfig.StorageProperties(
                URI.create("https://storage.example.com"),
                "access-key",
                "secret-key",
                "bucket-privado",
                "auto",
                "path",
                Duration.ofHours(1));
    }
}
