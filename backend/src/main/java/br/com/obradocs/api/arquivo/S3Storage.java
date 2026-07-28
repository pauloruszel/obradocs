package br.com.obradocs.api.arquivo;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Component
class S3Storage {

	private final S3Client client;
	private final S3Presigner presigner;
	private final StorageConfig.StorageProperties properties;

	S3Storage(
			S3Client client,
			S3Presigner presigner,
			StorageConfig.StorageProperties properties) {
		this.client = client;
		this.presigner = presigner;
		this.properties = properties;
	}

	void armazenar(String path, MultipartFile arquivo, String contentType) {
		PutObjectRequest request = PutObjectRequest.builder()
				.bucket(properties.bucket())
				.key(path)
				.contentType(contentType)
				.contentLength(arquivo.getSize())
				.build();
		try (InputStream input = arquivo.getInputStream()) {
			client.putObject(request, RequestBody.fromInputStream(input, arquivo.getSize()));
		} catch (IOException | SdkException exception) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha ao armazenar arquivo", exception);
		}
	}

	DownloadTemporario criarDownload(String path, String contentType) {
		GetObjectRequest objectRequest = GetObjectRequest.builder()
				.bucket(properties.bucket())
				.key(path)
				.responseContentType(contentType)
				.responseContentDisposition("inline")
				.build();
		try {
			URI url = presigner.presignGetObject(GetObjectPresignRequest.builder()
							.signatureDuration(properties.downloadUrlTtl())
							.getObjectRequest(objectRequest)
							.build())
					.url()
					.toURI();
			return new DownloadTemporario(url, Instant.now().plus(properties.downloadUrlTtl()));
		} catch (Exception exception) {
			throw new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Falha ao gerar download temporario",
					exception);
		}
	}

	void excluirSilenciosamente(String path) {
		try {
			client.deleteObject(DeleteObjectRequest.builder()
					.bucket(properties.bucket())
					.key(path)
					.build());
		} catch (SdkException ignored) {
			// A falha de compensacao nao deve esconder o erro original da transacao.
		}
	}

	record DownloadTemporario(URI url, Instant expiresAt) {
	}
}
