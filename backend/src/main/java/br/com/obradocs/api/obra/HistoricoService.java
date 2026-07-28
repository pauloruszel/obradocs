package br.com.obradocs.api.obra;

import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class HistoricoService {

	private final HistoricoRepository historicos;

	public void registrar(UUID obraId, UUID usuarioId, String acao, Map<String, Object> detalhes) {
		historicos.save(new Historico(obraId, usuarioId, acao, detalhes));
	}
}
