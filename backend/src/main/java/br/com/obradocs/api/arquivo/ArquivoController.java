package br.com.obradocs.api.arquivo;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
class ArquivoController {

	private final ArquivoService service;

	@GetMapping("/obras/{obraId}/arquivos")
	List<ArquivoResponse> listar(
			@PathVariable UUID obraId,
			@RequestParam(required = false) ArquivoTipo tipo,
			@AuthenticationPrincipal Jwt jwt) {
		return service.listar(obraId, tipo, usuarioId(jwt)).stream()
				.map(ArquivoResponse::from)
				.toList();
	}

	@PostMapping(
			value = "/obras/{obraId}/arquivos",
			consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	ResponseEntity<ArquivoResponse> enviar(
			@PathVariable UUID obraId,
			@RequestParam ArquivoTipo tipo,
			@RequestPart MultipartFile arquivo,
			@AuthenticationPrincipal Jwt jwt) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(ArquivoResponse.from(service.enviar(obraId, tipo, arquivo, usuarioId(jwt))));
	}

	@PatchMapping("/arquivos/{arquivoId}")
	ArquivoResponse renomear(
			@PathVariable UUID arquivoId,
			@Valid @RequestBody RenomearArquivoRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return ArquivoResponse.from(service.renomear(arquivoId, request.nome(), usuarioId(jwt)));
	}

	@GetMapping("/arquivos/{arquivoId}/download-url")
	DownloadResponse download(@PathVariable UUID arquivoId, @AuthenticationPrincipal Jwt jwt) {
		S3Storage.DownloadTemporario download = service.criarDownload(arquivoId, usuarioId(jwt));
		return new DownloadResponse(download.url(), download.expiresAt());
	}

	private UUID usuarioId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}

	record RenomearArquivoRequest(@NotBlank @Size(max = 255) String nome) {
	}

	record ArquivoResponse(
			UUID id,
			UUID obraId,
			ArquivoTipo tipo,
			String nomeOriginal,
			String storagePath,
			String contentType,
			long tamanhoBytes,
			UUID enviadoPor,
			Instant createdAt) {

		static ArquivoResponse from(Arquivo arquivo) {
			return new ArquivoResponse(
					arquivo.getId(),
					arquivo.getObraId(),
					arquivo.getTipo(),
					arquivo.getNomeOriginal(),
					arquivo.getStoragePath(),
					arquivo.getContentType(),
					arquivo.getTamanhoBytes(),
					arquivo.getEnviadoPor(),
					arquivo.getCreatedAt());
		}
	}

	record DownloadResponse(URI url, Instant expiresAt) {
	}
}
