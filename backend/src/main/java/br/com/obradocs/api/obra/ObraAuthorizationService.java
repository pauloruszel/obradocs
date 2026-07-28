package br.com.obradocs.api.obra;

import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class ObraAuthorizationService {

	private final ObraRepository obras;
	private final PermissaoRepository permissoes;

	public void exigirLeitura(UUID obraId, UUID usuarioId) {
		if (obras.findByIdAndDeletedAtIsNull(obraId).isEmpty()) {
			throw new NoSuchElementException("Obra nao encontrada");
		}
		buscarPermissao(obraId, usuarioId);
	}

	public void exigirEdicao(UUID obraId, UUID usuarioId) {
		if (buscarPermissaoAtiva(obraId, usuarioId).getPapel() == Papel.VIEWER) {
			throw new AccessDeniedException("Usuario sem permissao de edicao");
		}
	}

	void exigirOwner(UUID obraId, UUID usuarioId) {
		if (buscarPermissaoAtiva(obraId, usuarioId).getPapel() != Papel.OWNER) {
			throw new AccessDeniedException("Somente o proprietario pode executar esta acao");
		}
	}

	private Permissao buscarPermissaoAtiva(UUID obraId, UUID usuarioId) {
		if (obras.findByIdAndDeletedAtIsNull(obraId).isEmpty()) {
			throw new NoSuchElementException("Obra nao encontrada");
		}
		return buscarPermissao(obraId, usuarioId);
	}

	private Permissao buscarPermissao(UUID obraId, UUID usuarioId) {
		return permissoes.findByObraIdAndUserId(obraId, usuarioId)
				.orElseThrow(() -> new AccessDeniedException("Acesso negado"));
	}
}
