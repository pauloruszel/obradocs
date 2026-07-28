package br.com.obradocs.api.obra;

import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
class ObraAuthorizationService {

	private final PermissaoRepository permissoes;

	ObraAuthorizationService(PermissaoRepository permissoes) {
		this.permissoes = permissoes;
	}

	Permissao exigirLeitura(UUID obraId, UUID usuarioId) {
		return permissoes.findByObraIdAndUserId(obraId, usuarioId)
				.orElseThrow(() -> new AccessDeniedException("Acesso negado"));
	}

	void exigirEdicao(UUID obraId, UUID usuarioId) {
		if (exigirLeitura(obraId, usuarioId).getPapel() == Papel.VIEWER) {
			throw new AccessDeniedException("Usuario sem permissao de edicao");
		}
	}

	void exigirOwner(UUID obraId, UUID usuarioId) {
		if (exigirLeitura(obraId, usuarioId).getPapel() != Papel.OWNER) {
			throw new AccessDeniedException("Somente o proprietario pode executar esta acao");
		}
	}
}
