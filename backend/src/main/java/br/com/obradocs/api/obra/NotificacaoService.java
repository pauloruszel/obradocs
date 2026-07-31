package br.com.obradocs.api.obra;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
class NotificacaoService {

	private final NotificacaoRepository notificacoes;
	private final HistoricoRepository historicos;
	private final ObraRepository obras;
	private final PermissaoRepository permissoes;

	@Transactional(readOnly = true)
	List<Detalhe> listar(UUID usuarioId) {
		return notificacoes.findTop50ByUsuarioIdOrderByCreatedAtDesc(usuarioId).stream()
				.map(this::detalhar)
				.toList();
	}

	@Transactional(readOnly = true)
	long contarNaoLidas(UUID usuarioId) {
		return notificacoes.countByUsuarioIdAndLidaAtIsNull(usuarioId);
	}

	@Transactional
	void marcarComoLida(UUID notificacaoId, UUID usuarioId) {
		notificacoes.findByIdAndUsuarioId(notificacaoId, usuarioId)
				.orElseThrow(() -> new NoSuchElementException("Notificação não encontrada"))
				.marcarComoLida();
	}

	@Transactional
	void marcarTodasComoLidas(UUID usuarioId) {
		notificacoes.marcarTodasComoLidas(usuarioId);
	}

	private Detalhe detalhar(Notificacao notificacao) {
		Historico historico = historicos.findById(notificacao.getHistoricoId()).orElseThrow();
		String obraNome = obras.findById(historico.getObraId()).map(Obra::getNome).orElse(null);
		String autorNome = historico.getUserId() == null
				? null
				: permissoes.buscarUsuario(historico.getUserId())
						.map(PermissaoRepository.UsuarioResumo::getNome)
						.orElse(null);
		return new Detalhe(
				notificacao.getId(),
				notificacao.getHistoricoId(),
				historico.getObraId(),
				obraNome,
				historico.getUserId(),
				autorNome,
				historico.getAcao(),
				historico.getDetalhes(),
				notificacao.getLidaAt(),
				notificacao.getCreatedAt());
	}

	record Detalhe(
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
	}
}
