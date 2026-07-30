package br.com.obradocs.api.arquivo;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
class ArquivoController {

	private final ArquivoService service;

	@GetMapping("/obras/{obraId}/arquivos")
	List<ArquivoResponse> listar(
			@PathVariable UUID obraId,
			@RequestParam(required = false) UUID categoriaId,
			@RequestParam(required = false) ArquivoTipo tipo,
			@RequestParam(required = false) String busca,
			@RequestParam(required = false) String ambiente,
			@AuthenticationPrincipal Jwt jwt) {
		return service.listar(obraId, categoriaId, tipo, busca, ambiente, usuarioId(jwt)).stream()
				.map(ArquivoResponse::from)
				.toList();
	}

	@GetMapping("/arquivos/{arquivoId}")
	ArquivoResponse buscar(@PathVariable UUID arquivoId, @AuthenticationPrincipal Jwt jwt) {
		return ArquivoResponse.from(service.buscar(arquivoId, usuarioId(jwt)));
	}

	@GetMapping("/arquivos/{arquivoId}/revisoes")
	List<ArquivoResponse> listarRevisoes(
			@PathVariable UUID arquivoId,
			@AuthenticationPrincipal Jwt jwt) {
		return service.listarRevisoes(arquivoId, usuarioId(jwt)).stream()
				.map(ArquivoResponse::from)
				.toList();
	}

	@PostMapping(value = "/obras/{obraId}/arquivos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	ResponseEntity<ArquivoResponse> enviar(
			@PathVariable UUID obraId,
			@RequestParam(required = false) UUID categoriaId,
			@RequestParam(required = false) ArquivoTipo tipo,
			@RequestParam(required = false) @Size(max = 80) String ambiente,
			@RequestPart MultipartFile arquivo,
			@AuthenticationPrincipal Jwt jwt) {
		return ResponseEntity.status(HttpStatus.CREATED).body(ArquivoResponse.from(
				service.enviar(obraId, categoriaId, tipo, ambiente, arquivo, usuarioId(jwt))));
	}

	@PostMapping(value = "/arquivos/{arquivoId}/revisoes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	ResponseEntity<ArquivoResponse> enviarRevisao(
			@PathVariable UUID arquivoId,
			@RequestPart MultipartFile arquivo,
			@AuthenticationPrincipal Jwt jwt) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(ArquivoResponse.from(service.enviarRevisao(arquivoId, arquivo, usuarioId(jwt))));
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
			UUID documentoId,
			UUID categoriaId,
			String categoriaNome,
			String ambiente,
			ArquivoTipo tipo,
			String nomeOriginal,
			String documentoNome,
			String storagePath,
			String contentType,
			long tamanhoBytes,
			UUID enviadoPor,
			String enviadoPorNome,
			int revisao,
			int revisaoAtual,
			boolean atual,
			Instant createdAt) {

		static ArquivoResponse from(ArquivoDetalhado detalhe) {
			Arquivo arquivo = detalhe.getArquivo();
			return new ArquivoResponse(
					arquivo.getId(),
					arquivo.getObraId(),
					arquivo.getDocumentoId(),
					detalhe.getCategoriaId(),
					detalhe.getCategoriaNome(),
					detalhe.getAmbiente(),
					arquivo.getTipo(),
					arquivo.getNomeOriginal(),
					detalhe.getDocumentoNome(),
					arquivo.getStoragePath(),
					arquivo.getContentType(),
					arquivo.getTamanhoBytes(),
					arquivo.getEnviadoPor(),
					detalhe.getEnviadoPorNome(),
					arquivo.getRevisao(),
					detalhe.getRevisaoAtual(),
					arquivo.getRevisao() == detalhe.getRevisaoAtual(),
					arquivo.getCreatedAt());
		}
	}

	record DownloadResponse(URI url, Instant expiresAt) {
	}
}
