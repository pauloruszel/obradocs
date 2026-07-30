package br.com.obradocs.api.obra;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;

import br.com.obradocs.api.arquivo.StorageDeletionQueue;
import br.com.obradocs.api.plano.PlanoLimiteService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
class ObraService {

	private static final String CODIGO_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	private static final SecureRandom RANDOM = new SecureRandom();

	private final ObraRepository obras;
	private final PermissaoRepository permissoes;
	private final HistoricoRepository historicos;
	private final HistoricoService historico;
	private final ObraAuthorizationService authorization;
	private final PlanoLimiteService limitesPlano;
	private final StorageDeletionQueue deletionQueue;
	private final JdbcTemplate jdbc;

	@Transactional(readOnly = true)
	List<Obra> listar(UUID usuarioId) {
		return obras.listarAtivasDoUsuario(usuarioId);
	}

	@Transactional(readOnly = true)
	Obra buscar(UUID obraId, UUID usuarioId) {
		Obra obra = buscarAtiva(obraId);
		authorization.exigirLeitura(obraId, usuarioId);
		return obra;
	}

	@Transactional
	Obra criar(String nome, UUID usuarioId) {
		limitesPlano.validarCriacaoObra(usuarioId);
		String nomeNormalizado = nome.trim();
		Obra obra = obras.save(new Obra(nomeNormalizado, gerarCodigoUnico(), usuarioId));
		permissoes.save(new Permissao(obra.getId(), usuarioId, Papel.OWNER));
		historico.registrar(
				obra.getId(), usuarioId, "CRIACAO_OBRA", Map.of("nome", nomeNormalizado));
		return obra;
	}

	@Transactional
	Obra entrarPorCodigo(String codigo, UUID usuarioId) {
		Obra obra = obras.findByCodigoCompartilhamentoAndDeletedAtIsNull(normalizarCodigo(codigo))
				.orElseThrow(() -> new NoSuchElementException("Obra não encontrada"));

		if (permissoes.findByObraIdAndUserId(obra.getId(), usuarioId).isEmpty()) {
			limitesPlano.validarNovoColaborador(obra.getId(), usuarioId);
			permissoes.save(new Permissao(obra.getId(), usuarioId, Papel.EDITOR));
			historico.registrar(
					obra.getId(),
					usuarioId,
					"ENTROU_OBRA",
					Map.of("codigo", obra.getCodigoCompartilhamento()));
		}
		return obra;
	}

	@Transactional
	Obra renomear(UUID obraId, String novoNome, UUID usuarioId) {
		Obra obra = buscarAtiva(obraId);
		authorization.exigirEdicao(obraId, usuarioId);
		String nomeNormalizado = novoNome.trim();
		obra.renomear(nomeNormalizado);
		historico.registrar(
				obraId, usuarioId, "RENOMEAR_OBRA", Map.of("novoNome", nomeNormalizado));
		return obra;
	}

	@Transactional
	void excluir(UUID obraId, UUID usuarioId) {
		Obra obra = buscarAtiva(obraId);
		authorization.exigirEdicao(obraId, usuarioId);
		deletionQueue.enqueue(jdbc.queryForList(
				"select storage_path from arquivos where obra_id = ?",
				String.class,
				obraId));
		obras.delete(obra);
	}

	@Transactional(readOnly = true)
	List<PermissaoDetalhada> listarPermissoes(UUID obraId, UUID usuarioId) {
		buscarAtiva(obraId);
		authorization.exigirLeitura(obraId, usuarioId);
		return permissoes.findAllByObraIdOrderByCreatedAtAsc(obraId).stream()
				.map(this::detalhar)
				.toList();
	}

	@Transactional
	PermissaoDetalhada adicionarPermissao(UUID obraId, String email, Papel papel, UUID usuarioId) {
		buscarAtiva(obraId);
		authorization.exigirOwner(obraId, usuarioId);
		UUID convidadoId = permissoes.buscarUsuarioIdPorEmail(email.trim().toLowerCase(Locale.ROOT))
				.orElseThrow(() -> new NoSuchElementException("Usuário não encontrado"));
		limitesPlano.validarNovoColaborador(obraId, convidadoId);

		Permissao permissao = permissoes.findByObraIdAndUserId(obraId, convidadoId)
				.map(existente -> alterarPapel(existente, papel))
				.orElseGet(() -> permissoes.save(new Permissao(obraId, convidadoId, papel)));
		return detalhar(permissao);
	}

	@Transactional
	PermissaoDetalhada atualizarPermissao(
			UUID obraId,
			UUID permissaoId,
			Papel papel,
			UUID usuarioId) {
		buscarAtiva(obraId);
		authorization.exigirOwner(obraId, usuarioId);
		Permissao permissao = buscarPermissao(obraId, permissaoId);
		garantirOwner(obraId, permissao, papel);
		permissao.alterarPapel(papel);
		return detalhar(permissao);
	}

	@Transactional
	void removerPermissao(UUID obraId, UUID permissaoId, UUID usuarioId) {
		buscarAtiva(obraId);
		authorization.exigirOwner(obraId, usuarioId);
		Permissao permissao = buscarPermissao(obraId, permissaoId);
		garantirOwner(obraId, permissao, null);
		permissoes.delete(permissao);
	}

	@Transactional(readOnly = true)
	List<HistoricoDetalhado> listarHistorico(UUID obraId, UUID usuarioId) {
		buscarAtiva(obraId);
		authorization.exigirLeitura(obraId, usuarioId);
		return historicos.findAllByObraIdOrderByCreatedAtDesc(obraId).stream()
				.map(historico -> new HistoricoDetalhado(
						historico,
						historico.getUserId() == null
								? null
								: permissoes.buscarUsuario(historico.getUserId()).orElse(null)))
				.toList();
	}

	private Obra buscarAtiva(UUID obraId) {
		return obras.findByIdAndDeletedAtIsNull(obraId)
				.orElseThrow(() -> new NoSuchElementException("Obra não encontrada"));
	}

	private Permissao buscarPermissao(UUID obraId, UUID permissaoId) {
		return permissoes.findByIdAndObraId(permissaoId, obraId)
				.orElseThrow(() -> new NoSuchElementException("Permissão não encontrada"));
	}

	private Permissao alterarPapel(Permissao permissao, Papel papel) {
		garantirOwner(permissao.getObraId(), permissao, papel);
		permissao.alterarPapel(papel);
		return permissao;
	}

	private void garantirOwner(UUID obraId, Permissao permissao, Papel novoPapel) {
		if (permissao.getPapel() == Papel.OWNER
				&& novoPapel != Papel.OWNER
				&& permissoes.countByObraIdAndPapel(obraId, Papel.OWNER) == 1) {
			throw new IllegalArgumentException("A obra deve manter ao menos um proprietário");
		}
	}

	private PermissaoDetalhada detalhar(Permissao permissao) {
		return new PermissaoDetalhada(
				permissao,
				permissoes.buscarUsuario(permissao.getUserId())
						.orElseThrow(() -> new NoSuchElementException("Usuário não encontrado")));
	}

	private String gerarCodigoUnico() {
		for (int tentativa = 0; tentativa < 10; tentativa++) {
			StringBuilder codigo = new StringBuilder(9);
			for (int i = 0; i < 8; i++) {
				if (i == 4) {
					codigo.append('-');
				}
				codigo.append(CODIGO_CHARS.charAt(RANDOM.nextInt(CODIGO_CHARS.length())));
			}
			String valor = codigo.toString();
			if (!obras.existsByCodigoCompartilhamento(valor)) {
				return valor;
			}
		}
		throw new IllegalStateException("Não foi possível gerar código de compartilhamento");
	}

	private String normalizarCodigo(String codigo) {
		String limpo = codigo.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
		if (limpo.length() != 8) {
			throw new IllegalArgumentException("Código de compartilhamento inválido");
		}
		return limpo.substring(0, 4) + "-" + limpo.substring(4);
	}

	record PermissaoDetalhada(Permissao permissao, PermissaoRepository.UsuarioResumo usuario) {
	}

	record HistoricoDetalhado(Historico historico, PermissaoRepository.UsuarioResumo usuario) {
	}
}
