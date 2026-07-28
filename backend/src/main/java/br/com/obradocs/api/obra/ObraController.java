package br.com.obradocs.api.obra;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/v1/obras")
@RequiredArgsConstructor
class ObraController {

	private final ObraService service;

	@GetMapping
	List<ObraResponse> listar(@AuthenticationPrincipal Jwt jwt) {
		return service.listar(usuarioId(jwt)).stream().map(ObraResponse::from).toList();
	}

	@PostMapping
	ResponseEntity<ObraResponse> criar(
			@Valid @RequestBody CriarObraRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(ObraResponse.from(service.criar(request.nome(), usuarioId(jwt))));
	}

	@GetMapping("/{obraId}")
	ObraResponse buscar(@PathVariable UUID obraId, @AuthenticationPrincipal Jwt jwt) {
		return ObraResponse.from(service.buscar(obraId, usuarioId(jwt)));
	}

	@PatchMapping("/{obraId}")
	ObraResponse renomear(
			@PathVariable UUID obraId,
			@Valid @RequestBody RenomearObraRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return ObraResponse.from(service.renomear(obraId, request.nome(), usuarioId(jwt)));
	}

	@DeleteMapping("/{obraId}")
	ResponseEntity<Void> excluir(@PathVariable UUID obraId, @AuthenticationPrincipal Jwt jwt) {
		service.excluir(obraId, usuarioId(jwt));
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/entrar")
	ObraResponse entrar(
			@Valid @RequestBody EntrarObraRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return ObraResponse.from(service.entrarPorCodigo(request.codigo(), usuarioId(jwt)));
	}

	@GetMapping("/{obraId}/permissoes")
	List<PermissaoResponse> listarPermissoes(
			@PathVariable UUID obraId,
			@AuthenticationPrincipal Jwt jwt) {
		return service.listarPermissoes(obraId, usuarioId(jwt)).stream()
				.map(PermissaoResponse::from)
				.toList();
	}

	@PostMapping("/{obraId}/permissoes")
	ResponseEntity<PermissaoResponse> adicionarPermissao(
			@PathVariable UUID obraId,
			@Valid @RequestBody AdicionarPermissaoRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return ResponseEntity.status(HttpStatus.CREATED).body(PermissaoResponse.from(
				service.adicionarPermissao(obraId, request.email(), request.papel(), usuarioId(jwt))));
	}

	@PatchMapping("/{obraId}/permissoes/{permissaoId}")
	PermissaoResponse atualizarPermissao(
			@PathVariable UUID obraId,
			@PathVariable UUID permissaoId,
			@Valid @RequestBody AtualizarPermissaoRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return PermissaoResponse.from(
				service.atualizarPermissao(obraId, permissaoId, request.papel(), usuarioId(jwt)));
	}

	@DeleteMapping("/{obraId}/permissoes/{permissaoId}")
	ResponseEntity<Void> removerPermissao(
			@PathVariable UUID obraId,
			@PathVariable UUID permissaoId,
			@AuthenticationPrincipal Jwt jwt) {
		service.removerPermissao(obraId, permissaoId, usuarioId(jwt));
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/{obraId}/historico")
	List<HistoricoResponse> listarHistorico(
			@PathVariable UUID obraId,
			@AuthenticationPrincipal Jwt jwt) {
		return service.listarHistorico(obraId, usuarioId(jwt)).stream()
				.map(HistoricoResponse::from)
				.toList();
	}

	private UUID usuarioId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}

	record CriarObraRequest(@NotBlank @Size(min = 3, max = 200) String nome) {
	}

	record RenomearObraRequest(@NotBlank @Size(min = 3, max = 200) String nome) {
	}

	record EntrarObraRequest(@NotBlank @Size(max = 20) String codigo) {
	}

	record AdicionarPermissaoRequest(
			@NotBlank @Email @Size(max = 320) String email,
			@NotNull Papel papel) {
	}

	record AtualizarPermissaoRequest(@NotNull Papel papel) {
	}

	record ObraResponse(
			UUID id,
			String nome,
			String codigoCompartilhamento,
			UUID createdBy,
			Instant deletedAt,
			UUID deletedBy,
			Instant createdAt) {

		static ObraResponse from(Obra obra) {
			return new ObraResponse(
					obra.getId(),
					obra.getNome(),
					obra.getCodigoCompartilhamento(),
					obra.getCreatedBy(),
					obra.getDeletedAt(),
					obra.getDeletedBy(),
					obra.getCreatedAt());
		}
	}

	record ProfileResponse(UUID id, String nome, String email) {

		static ProfileResponse from(PermissaoRepository.UsuarioResumo usuario) {
			return new ProfileResponse(usuario.getId(), usuario.getNome(), usuario.getEmail());
		}
	}

	record PermissaoResponse(
			UUID id,
			UUID obraId,
			UUID userId,
			Papel papel,
			Instant createdAt,
			ProfileResponse profiles) {

		static PermissaoResponse from(ObraService.PermissaoDetalhada detalhe) {
			Permissao permissao = detalhe.permissao();
			return new PermissaoResponse(
					permissao.getId(),
					permissao.getObraId(),
					permissao.getUserId(),
					permissao.getPapel(),
					permissao.getCreatedAt(),
					ProfileResponse.from(detalhe.usuario()));
		}
	}

	record HistoricoResponse(
			UUID id,
			UUID obraId,
			UUID userId,
			String acao,
			Map<String, Object> detalhes,
			Instant createdAt,
			ProfileResponse profiles) {

		static HistoricoResponse from(ObraService.HistoricoDetalhado detalhe) {
			Historico historico = detalhe.historico();
			return new HistoricoResponse(
					historico.getId(),
					historico.getObraId(),
					historico.getUserId(),
					historico.getAcao(),
					historico.getDetalhes(),
					historico.getCreatedAt(),
					detalhe.usuario() == null ? null : ProfileResponse.from(detalhe.usuario()));
		}
	}
}
