package br.com.obradocs.api.arquivo;

import java.net.URI;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
@EnableConfigurationProperties(StorageConfig.StorageProperties.class)
class StorageConfig {

	@Bean
	S3Client s3Client(StorageProperties properties) {
		return S3Client.builder()
				.endpointOverride(properties.endpoint())
				.region(Region.of(properties.region()))
				.credentialsProvider(properties.credentials())
				.serviceConfiguration(properties.s3Configuration())
				.httpClientBuilder(UrlConnectionHttpClient.builder())
				.build();
	}

	@Bean
	S3Presigner s3Presigner(StorageProperties properties) {
		return S3Presigner.builder()
				.endpointOverride(properties.endpoint())
				.region(Region.of(properties.region()))
				.credentialsProvider(properties.credentials())
				.serviceConfiguration(properties.s3Configuration())
				.build();
	}

	@ConfigurationProperties("app.storage")
	record StorageProperties(
			URI endpoint,
			String accessKeyId,
			String secretAccessKey,
			String bucket,
			String region,
			String urlStyle,
			Duration downloadUrlTtl) {

		StorageProperties {
			if (endpoint == null
					|| isBlank(accessKeyId)
					|| isBlank(secretAccessKey)
					|| isBlank(bucket)
					|| isBlank(region)) {
				throw new IllegalStateException("Configuracao do storage S3 incompleta");
			}
			if (!"virtual".equalsIgnoreCase(urlStyle) && !"path".equalsIgnoreCase(urlStyle)) {
				throw new IllegalStateException("AWS_S3_URL_STYLE deve ser virtual ou path");
			}
			if (downloadUrlTtl == null
					|| downloadUrlTtl.isZero()
					|| downloadUrlTtl.isNegative()
					|| downloadUrlTtl.compareTo(Duration.ofDays(7)) > 0) {
				throw new IllegalStateException("STORAGE_DOWNLOAD_URL_TTL deve estar entre 1 segundo e 7 dias");
			}
		}

		private StaticCredentialsProvider credentials() {
			return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretAccessKey));
		}

		private S3Configuration s3Configuration() {
			return S3Configuration.builder()
					.pathStyleAccessEnabled("path".equalsIgnoreCase(urlStyle))
					.build();
		}

		private static boolean isBlank(String value) {
			return value == null || value.isBlank();
		}
	}
}
