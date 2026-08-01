package br.com.obradocs.api.obra;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
@RequestMapping("/v1")
@RequiredArgsConstructor
class ObraConviteController {

	private final ObraConviteService service;

	@PostMapping("/obras/{obraId}/convites")
	ResponseEntity<ConviteResponse> criar(
			@PathVariable UUID obraId,
			@Valid @RequestBody CriarConviteRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(ConviteResponse.from(service.criar(
						obraId, request.email(), request.papel(), usuarioId(jwt))));
	}

	@GetMapping("/obras/{obraId}/convites")
	List<ConviteResponse> listar(@PathVariable UUID obraId, @AuthenticationPrincipal Jwt jwt) {
		return service.listar(obraId, usuarioId(jwt)).stream().map(ConviteResponse::from).toList();
	}

	@DeleteMapping("/obras/{obraId}/convites/{conviteId}")
	ConviteResponse revogar(
			@PathVariable UUID obraId,
			@PathVariable UUID conviteId,
			@AuthenticationPrincipal Jwt jwt) {
		return ConviteResponse.from(service.revogar(obraId, conviteId, usuarioId(jwt)));
	}

	@PostMapping("/convites/aceitar")
	ObraController.ObraResponse aceitar(
			@Valid @RequestBody AceitarConviteRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return ObraController.ObraResponse.from(service.aceitar(request.token(), usuarioId(jwt)));
	}

	private UUID usuarioId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}

	record CriarConviteRequest(
			@NotBlank @Email @Size(max = 320) String email,
			@NotNull Papel papel) {
	}

	record AceitarConviteRequest(@NotBlank @Size(max = 200) String token) {
	}

	record ConviteResponse(
			UUID id,
			UUID obraId,
			String email,
			Papel papel,
			ObraConvite.Status status,
			Instant expiresAt,
			UUID invitedBy,
			UUID acceptedBy,
			Instant createdAt,
			Instant acceptedAt) {

		static ConviteResponse from(ObraConvite convite) {
			return new ConviteResponse(
					convite.getId(),
					convite.getObraId(),
					convite.getEmail(),
					convite.getPapel(),
					convite.getStatus(),
					convite.getExpiresAt(),
					convite.getInvitedBy(),
					convite.getAcceptedBy(),
					convite.getCreatedAt(),
					convite.getAcceptedAt());
		}
	}
}
