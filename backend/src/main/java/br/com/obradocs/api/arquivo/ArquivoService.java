package br.com.obradocs.api.arquivo;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import br.com.obradocs.api.obra.HistoricoService;
import br.com.obradocs.api.obra.ObraAuthorizationService;
import br.com.obradocs.api.plano.PlanoLimiteService;
import br.com.obradocs.api.categoria.CategoriaObra;
import br.com.obradocs.api.categoria.CategoriaObraService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
class ArquivoService {

	private final ArquivoRepository arquivos;
	private final DocumentoRepository documentos;
	private final ObraAuthorizationService authorization;
	private final HistoricoService historico;
	private final S3Storage storage;
	private final TransactionTemplate transactions;
	private final PlanoLimiteService limitesPlano;
	private final CategoriaObraService categorias;
	private final ArquivoUploadValidator uploadValidator;

	@Transactional(readOnly = true)
	List<ArquivoDetalhado> listar(
			UUID obraId,
			UUID categoriaId,
			ArquivoTipo tipo,
			String busca,
			String ambiente,
			UUID usuarioId) {
		authorization.exigirLeitura(obraId, usuarioId);
		String termo = busca == null || busca.isBlank() ? null : busca.trim();
		if (termo != null && termo.length() > 100) {
			throw new IllegalArgumentException("Busca muito longa; limite de 100 caracteres");
		}
		List<ArquivoDetalhado> resultado;
		if (categoriaId != null) {
			categorias.buscar(obraId, categoriaId);
			resultado = termo == null
					? arquivos.listarPorCategoria(obraId, categoriaId)
					: arquivos.pesquisarPorCategoriaENome(obraId, categoriaId, termo);
		} else if (tipo == null && termo == null) {
			resultado = arquivos.listarTodos(obraId);
		} else if (termo == null) {
			resultado = arquivos.listarPorTipo(obraId, tipo);
		} else if (tipo == null) {
			resultado = arquivos.pesquisarPorNome(obraId, termo);
		} else {
			resultado = arquivos.pesquisarPorTipoENome(obraId, tipo, termo);
		}
		String ambienteNormalizado = normalizarAmbiente(ambiente);
		return ambienteNormalizado == null
				? resultado
				: resultado.stream()
						.filter(item -> ambienteNormalizado.equalsIgnoreCase(item.getAmbiente()))
						.toList();
	}

	@Transactional(readOnly = true)
	Page<ArquivoDetalhado> listarPaginado(
			UUID obraId,
			UUID categoriaId,
			ArquivoTipo tipo,
			String busca,
			String ambiente,
			UUID usuarioId,
			Pageable pageable) {
		authorization.exigirLeitura(obraId, usuarioId);
		String termo = busca == null || busca.isBlank() ? null : busca.trim();
		if (termo != null && termo.length() > 100) {
			throw new IllegalArgumentException("Busca muito longa; limite de 100 caracteres");
		}
		if (categoriaId != null) {
			categorias.buscar(obraId, categoriaId);
		}
		return arquivos.listarPaginado(
				obraId,
				categoriaId,
				tipo,
				termo,
				normalizarAmbiente(ambiente),
				pageable);
	}

	@Transactional(readOnly = true)
	ArquivoDetalhado buscar(UUID arquivoId, UUID usuarioId) {
		ArquivoDetalhado detalhe = buscarDetalhadoPorId(arquivoId);
		authorization.exigirLeitura(detalhe.getArquivo().getObraId(), usuarioId);
		return detalhe;
	}

	ArquivoDetalhado enviar(
			UUID obraId,
			UUID categoriaId,
			ArquivoTipo tipoLegado,
			String ambiente,
			MultipartFile multipart,
			UUID usuarioId) {
		authorization.exigirEdicao(obraId, usuarioId);
		CategoriaObra categoria = categoriaId != null
				? categorias.buscar(obraId, categoriaId)
				: categorias.buscarLegada(
						obraId,
						tipoLegado == null ? ArquivoTipo.FOTO : tipoLegado);
		ArquivoUploadValidator.ArquivoValidado validado = uploadValidator.validar(multipart);
		UUID reservaId = limitesPlano.reservarUpload(obraId, multipart.getSize());
		String storagePath = novoStoragePath(obraId);

		try {
			storage.armazenar(storagePath, multipart, validado.contentType());
			return transactions.execute(status -> {
				Documento documento = documentos.save(new Documento(
						obraId,
						categoria.getId(),
						categoria.getTipo(),
						validado.nome(),
						normalizarAmbiente(ambiente)));
				Arquivo arquivo = arquivos.save(new Arquivo(
						obraId,
						documento.getId(),
						1,
						categoria.getTipo(),
						validado.nome(),
						storagePath,
						validado.contentType(),
						multipart.getSize(),
						usuarioId));
				historico.registrar(
						obraId,
						usuarioId,
						"UPLOAD_ARQUIVO",
						Map.of(
								"arquivoId", arquivo.getId(),
								"documentoId", documento.getId(),
								"nomeOriginal", arquivo.getNomeOriginal(),
								"tipo", arquivo.getTipo().name(),
								"categoriaId", categoria.getId(),
								"categoria", categoria.getNome(),
								"revisao", 1));
				limitesPlano.liberarReserva(reservaId);
				return buscarDetalhadoPorId(arquivo.getId());
			});
		} catch (RuntimeException exception) {
			storage.excluirSilenciosamente(storagePath);
			liberarReservaPreservandoErro(reservaId, exception);
			throw exception;
		}
	}

	ArquivoDetalhado enviarRevisao(UUID arquivoId, MultipartFile multipart, UUID usuarioId) {
		ArquivoDetalhado referencia = buscarDetalhadoPorId(arquivoId);
		Arquivo arquivoAnterior = referencia.getArquivo();
		authorization.exigirEdicao(arquivoAnterior.getObraId(), usuarioId);
		ArquivoUploadValidator.ArquivoValidado validado = uploadValidator.validar(multipart);
		uploadValidator.validarCompatibilidadeRevisao(
				validado,
				arquivoAnterior.getContentType());
		UUID reservaId = limitesPlano.reservarUpload(arquivoAnterior.getObraId(), multipart.getSize());
		String storagePath = novoStoragePath(arquivoAnterior.getObraId());

		try {
			storage.armazenar(storagePath, multipart, validado.contentType());
			return transactions.execute(status -> {
				Documento documento = documentos.findByIdForUpdate(arquivoAnterior.getDocumentoId())
						.orElseThrow(() -> new NoSuchElementException("Documento não encontrado"));
				int revisao = documento.adicionarRevisao();
				Arquivo arquivo = arquivos.save(new Arquivo(
						documento.getObraId(),
						documento.getId(),
						revisao,
						documento.getTipo(),
						validado.nome(),
						storagePath,
						validado.contentType(),
						multipart.getSize(),
						usuarioId));
				historico.registrar(
						documento.getObraId(),
						usuarioId,
						"NOVA_REVISAO",
						Map.of(
								"arquivoId", arquivo.getId(),
								"documentoId", documento.getId(),
								"nome", documento.getNome(),
								"revisao", revisao));
				limitesPlano.liberarReserva(reservaId);
				return buscarDetalhadoPorId(arquivo.getId());
			});
		} catch (RuntimeException exception) {
			storage.excluirSilenciosamente(storagePath);
			liberarReservaPreservandoErro(reservaId, exception);
			throw exception;
		}
	}

	@Transactional(readOnly = true)
	List<ArquivoDetalhado> listarRevisoes(UUID arquivoId, UUID usuarioId) {
		Arquivo arquivo = buscarDetalhadoPorId(arquivoId).getArquivo();
		authorization.exigirLeitura(arquivo.getObraId(), usuarioId);
		return arquivos.listarRevisoes(arquivo.getDocumentoId());
	}

	@Transactional
	ArquivoDetalhado solicitarAprovacao(UUID arquivoId, UUID usuarioId) {
		Arquivo arquivo = arquivos.findByIdForUpdate(arquivoId)
				.orElseThrow(() -> new NoSuchElementException("Arquivo não encontrado"));
		authorization.exigirEdicao(arquivo.getObraId(), usuarioId);
		arquivo.solicitarAprovacao(usuarioId);
		historico.registrar(
				arquivo.getObraId(),
				usuarioId,
				"APROVACAO_SOLICITADA",
				Map.of(
						"arquivoId", arquivo.getId(),
						"documentoId", arquivo.getDocumentoId(),
						"revisao", arquivo.getRevisao()));
		return buscarDetalhadoPorId(arquivoId);
	}

	@Transactional
	ArquivoDetalhado decidirAprovacao(
			UUID arquivoId,
			AprovacaoStatus decisao,
			String comentario,
			UUID usuarioId) {
		Arquivo arquivo = arquivos.findByIdForUpdate(arquivoId)
				.orElseThrow(() -> new NoSuchElementException("Arquivo não encontrado"));
		authorization.exigirOwner(arquivo.getObraId(), usuarioId);
		arquivo.decidirAprovacao(decisao, comentario, usuarioId);
		if (decisao == AprovacaoStatus.APPROVED) {
			Documento documento = documentos.findByIdForUpdate(arquivo.getDocumentoId())
					.orElseThrow(() -> new NoSuchElementException("Documento não encontrado"));
			documento.aprovarRevisao(arquivo.getRevisao());
		}
		Map<String, Object> detalhes = decisao == AprovacaoStatus.CHANGES_REQUESTED
				? Map.of(
						"arquivoId", arquivo.getId(),
						"documentoId", arquivo.getDocumentoId(),
						"revisao", arquivo.getRevisao(),
						"solicitanteId", arquivo.getAprovacaoSolicitadaPor(),
						"comentario", arquivo.getAprovacaoComentario())
				: Map.of(
						"arquivoId", arquivo.getId(),
						"documentoId", arquivo.getDocumentoId(),
						"revisao", arquivo.getRevisao(),
						"solicitanteId", arquivo.getAprovacaoSolicitadaPor());
		historico.registrar(
				arquivo.getObraId(),
				usuarioId,
				decisao == AprovacaoStatus.APPROVED ? "REVISAO_APROVADA" : "ALTERACOES_SOLICITADAS",
				detalhes);
		return buscarDetalhadoPorId(arquivoId);
	}

	@Transactional(readOnly = true)
	S3Storage.DownloadTemporario criarDownload(UUID arquivoId, UUID usuarioId) {
		Arquivo arquivo = buscarDetalhadoPorId(arquivoId).getArquivo();
		authorization.exigirLeitura(arquivo.getObraId(), usuarioId);
		return storage.criarDownload(arquivo.getStoragePath(), arquivo.getContentType());
	}

	@Transactional
	ArquivoDetalhado renomear(UUID arquivoId, String novoNome, UUID usuarioId) {
		ArquivoDetalhado detalhe = buscarDetalhadoPorId(arquivoId);
		Arquivo arquivo = detalhe.getArquivo();
		authorization.exigirEdicao(arquivo.getObraId(), usuarioId);
		String nome = uploadValidator.validarNome(novoNome);
		uploadValidator.validarExtensao(nome, arquivo.getContentType());
		Documento documento = documentos.findById(arquivo.getDocumentoId())
				.orElseThrow(() -> new NoSuchElementException("Documento não encontrado"));
		documento.renomear(nome);
		historico.registrar(
				arquivo.getObraId(),
				usuarioId,
				"RENOMEAR_ARQUIVO",
				Map.of("arquivoId", arquivoId, "documentoId", documento.getId(), "novoNome", nome));
		return buscarDetalhadoPorId(arquivoId);
	}

	private ArquivoDetalhado buscarDetalhadoPorId(UUID arquivoId) {
		return arquivos.findDetalhadoById(arquivoId)
				.orElseThrow(() -> new NoSuchElementException("Arquivo não encontrado"));
	}

	private String novoStoragePath(UUID obraId) {
		return obraId + "/" + UUID.randomUUID();
	}

	private void liberarReservaPreservandoErro(UUID reservaId, RuntimeException erroOriginal) {
		try {
			limitesPlano.liberarReserva(reservaId);
		} catch (RuntimeException erroCompensacao) {
			erroOriginal.addSuppressed(erroCompensacao);
		}
	}

	private String normalizarAmbiente(String ambiente) {
		if (ambiente == null || ambiente.isBlank()) {
			return null;
		}
		String normalizado = ambiente.trim();
		if (normalizado.length() > 80) {
			throw new IllegalArgumentException("O ambiente deve ter no mÃ¡ximo 80 caracteres");
		}
		return normalizado;
	}

}
