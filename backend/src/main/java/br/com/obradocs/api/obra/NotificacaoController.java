package br.com.obradocs.api.obra;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/v1/notificacoes")
@RequiredArgsConstructor
class NotificacaoController {

	private final NotificacaoService service;

	@GetMapping
	List<NotificacaoResponse> listar(@AuthenticationPrincipal Jwt jwt) {
		return service.listar(usuarioId(jwt)).stream().map(NotificacaoResponse::from).toList();
	}

	@GetMapping("/nao-lidas/count")
	ContagemResponse contarNaoLidas(@AuthenticationPrincipal Jwt jwt) {
		return new ContagemResponse(service.contarNaoLidas(usuarioId(jwt)));
	}

	@PatchMapping("/{notificacaoId}/lida")
	ResponseEntity<Void> marcarComoLida(
			@PathVariable UUID notificacaoId,
			@AuthenticationPrincipal Jwt jwt) {
		service.marcarComoLida(notificacaoId, usuarioId(jwt));
		return ResponseEntity.noContent().build();
	}

	@PatchMapping("/lidas")
	ResponseEntity<Void> marcarTodasComoLidas(@AuthenticationPrincipal Jwt jwt) {
		service.marcarTodasComoLidas(usuarioId(jwt));
		return ResponseEntity.noContent().build();
	}

	private UUID usuarioId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}

	record ContagemResponse(long quantidade) {
	}

	record NotificacaoResponse(
			UUID id,
			UUID historicoId,
			UUID obraId,
			String obraNome,
			UUID autorId,
			String autorNome,
			String acao,
			Map<String, Object> detalhes,
			Instant lidaAt,
			Instant createdAt) {

		static NotificacaoResponse from(NotificacaoService.Detalhe detalhe) {
			return new NotificacaoResponse(
					detalhe.id(),
					detalhe.historicoId(),
					detalhe.obraId(),
					detalhe.obraNome(),
					detalhe.autorId(),
					detalhe.autorNome(),
					detalhe.acao(),
					detalhe.detalhes(),
					detalhe.lidaAt(),
					detalhe.createdAt());
		}
	}
}
