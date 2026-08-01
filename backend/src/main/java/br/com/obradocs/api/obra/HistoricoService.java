package br.com.obradocs.api.obra;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class HistoricoService {

	private final HistoricoRepository historicos;
	private final PermissaoRepository permissoes;
	private final NotificacaoRepository notificacoes;

	public void registrar(UUID obraId, UUID usuarioId, String acao, Map<String, Object> detalhes) {
		Historico evento = historicos.save(new Historico(obraId, usuarioId, acao, detalhes));
		List<UUID> destinatarios = switch (acao) {
			case "UPLOAD_ARQUIVO", "NOVA_REVISAO" -> participantesExceto(obraId, usuarioId);
			case "APROVACAO_SOLICITADA" -> ownersExceto(obraId, usuarioId);
			case "REVISAO_APROVADA" -> Stream.concat(
					usuarioDetalhes(detalhes, "solicitanteId", usuarioId).stream(),
					viewersExceto(obraId, usuarioId).stream()).toList();
			case "ALTERACOES_SOLICITADAS" -> usuarioDetalhes(detalhes, "solicitanteId", usuarioId);
			case "ENTROU_OBRA" -> ownersExceto(obraId, usuarioId);
			case "ACESSO_CONCEDIDO" -> usuarioDetalhes(detalhes, "convidadoId", usuarioId);
			default -> List.of();
		};
		notificacoes.saveAll(destinatarios.stream()
				.distinct()
				.map(destinatario -> new Notificacao(destinatario, evento.getId()))
				.toList());
	}

	private List<UUID> participantesExceto(UUID obraId, UUID usuarioId) {
		return permissoes.findAllByObraIdOrderByCreatedAtAsc(obraId).stream()
				.map(Permissao::getUserId)
				.filter(id -> !id.equals(usuarioId))
				.toList();
	}

	private List<UUID> ownersExceto(UUID obraId, UUID usuarioId) {
		return permissoes.findAllByObraIdOrderByCreatedAtAsc(obraId).stream()
				.filter(permissao -> permissao.getPapel() == Papel.OWNER)
				.map(Permissao::getUserId)
				.filter(id -> !id.equals(usuarioId))
				.toList();
	}

	private List<UUID> viewersExceto(UUID obraId, UUID usuarioId) {
		return permissoes.findAllByObraIdOrderByCreatedAtAsc(obraId).stream()
				.filter(permissao -> permissao.getPapel() == Papel.VIEWER)
				.map(Permissao::getUserId)
				.filter(id -> !id.equals(usuarioId))
				.toList();
	}

	private List<UUID> usuarioDetalhes(Map<String, Object> detalhes, String campo, UUID usuarioId) {
		Object valor = detalhes.get(campo);
		if (valor == null) {
			return List.of();
		}
		UUID convidadoId = UUID.fromString(valor.toString());
		return convidadoId.equals(usuarioId) ? List.of() : List.of(convidadoId);
	}
}
