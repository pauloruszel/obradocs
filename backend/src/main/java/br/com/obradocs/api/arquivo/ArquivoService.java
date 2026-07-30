package br.com.obradocs.api.arquivo;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import br.com.obradocs.api.obra.HistoricoService;
import br.com.obradocs.api.obra.ObraAuthorizationService;
import br.com.obradocs.api.plano.PlanoLimiteService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
class ArquivoService {

	private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;
	private static final byte[] PDF_HEADER = {'%', 'P', 'D', 'F', '-'};
	private static final byte[] JPEG_HEADER = {(byte) 0xff, (byte) 0xd8, (byte) 0xff};

	private final ArquivoRepository arquivos;
	private final ObraAuthorizationService authorization;
	private final HistoricoService historico;
	private final S3Storage storage;
	private final TransactionTemplate transactions;
	private final PlanoLimiteService limitesPlano;

	@Transactional(readOnly = true)
	List<ArquivoDetalhado> listar(UUID obraId, ArquivoTipo tipo, String busca, UUID usuarioId) {
		authorization.exigirLeitura(obraId, usuarioId);
		String termo = busca == null || busca.isBlank() ? null : busca.trim();
		if (termo != null && termo.length() > 100) {
			throw new IllegalArgumentException("Busca muito longa; limite de 100 caracteres");
		}
		if (tipo == null && termo == null) {
			return arquivos.listarTodos(obraId);
		}
		if (termo == null) {
			return arquivos.listarPorTipo(obraId, tipo);
		}
		if (tipo == null) {
			return arquivos.pesquisarPorNome(obraId, termo);
		}
		return arquivos.pesquisarPorTipoENome(obraId, tipo, termo);
	}

	@Transactional(readOnly = true)
	ArquivoDetalhado buscar(UUID arquivoId, UUID usuarioId) {
		ArquivoDetalhado detalhe = buscarDetalhadoPorId(arquivoId);
		authorization.exigirLeitura(detalhe.getArquivo().getObraId(), usuarioId);
		return detalhe;
	}

	ArquivoDetalhado enviar(UUID obraId, ArquivoTipo tipo, MultipartFile multipart, UUID usuarioId) {
		authorization.exigirEdicao(obraId, usuarioId);
		ArquivoValidado validado = validar(multipart);
		UUID reservaId = limitesPlano.reservarUpload(obraId, multipart.getSize());
		String storagePath = obraId + "/" + UUID.randomUUID() + "-" + sanitizar(validado.nome());

		try {
			storage.armazenar(storagePath, multipart, validado.contentType());
			return transactions.execute(status -> {
				Arquivo arquivo = arquivos.save(new Arquivo(
						obraId,
						tipo,
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
								"nomeOriginal", arquivo.getNomeOriginal(),
								"tipo", arquivo.getTipo().name()));
				limitesPlano.liberarReserva(reservaId);
				return buscarDetalhadoPorId(arquivo.getId());
			});
		} catch (RuntimeException exception) {
			storage.excluirSilenciosamente(storagePath);
			limitesPlano.liberarReserva(reservaId);
			throw exception;
		}
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
		String nome = validarNome(novoNome);
		validarExtensao(nome, arquivo.getContentType());
		arquivo.renomear(nome);
		historico.registrar(
				arquivo.getObraId(),
				usuarioId,
				"RENOMEAR_ARQUIVO",
				Map.of("arquivoId", arquivoId, "novoNome", nome));
		return detalhe;
	}

	private ArquivoDetalhado buscarDetalhadoPorId(UUID arquivoId) {
		return arquivos.findDetalhadoById(arquivoId)
				.orElseThrow(() -> new NoSuchElementException("Arquivo não encontrado"));
	}

	private ArquivoValidado validar(MultipartFile multipart) {
		if (multipart == null || multipart.isEmpty()) {
			throw new IllegalArgumentException("Arquivo vazio");
		}
		if (multipart.getSize() > MAX_SIZE_BYTES) {
			throw new IllegalArgumentException("Arquivo muito grande; limite de 10 MB");
		}

		String nome = validarNome(multipart.getOriginalFilename());
		String detectado = detectarContentType(multipart);
		String declarado = multipart.getContentType();
		if (declarado != null
				&& !declarado.isBlank()
				&& !"application/octet-stream".equalsIgnoreCase(declarado)
				&& !detectado.equalsIgnoreCase(declarado)) {
			throw new IllegalArgumentException("Conteúdo do arquivo não corresponde ao tipo informado");
		}
		validarExtensao(nome, detectado);
		return new ArquivoValidado(nome, detectado);
	}

	private String detectarContentType(MultipartFile multipart) {
		try (InputStream input = multipart.getInputStream()) {
			byte[] header = input.readNBytes(PDF_HEADER.length);
			if (Arrays.equals(header, PDF_HEADER)) {
				return "application/pdf";
			}
			if (header.length >= JPEG_HEADER.length
					&& Arrays.equals(Arrays.copyOf(header, JPEG_HEADER.length), JPEG_HEADER)) {
				return "image/jpeg";
			}
		} catch (IOException exception) {
			throw new IllegalArgumentException("Não foi possível ler o arquivo", exception);
		}
		throw new IllegalArgumentException("Formato inválido; use PDF ou JPEG");
	}

	private String validarNome(String nomeOriginal) {
		if (nomeOriginal == null) {
			throw new IllegalArgumentException("Nome do arquivo obrigatorio");
		}
		String nome = nomeOriginal.replace('\\', '/');
		nome = nome.substring(nome.lastIndexOf('/') + 1).trim();
		if (nome.isBlank() || nome.length() > 255 || nome.chars().anyMatch(Character::isISOControl)) {
			throw new IllegalArgumentException("Nome do arquivo inválido");
		}
		return nome;
	}

	private void validarExtensao(String nome, String contentType) {
		String lower = nome.toLowerCase(Locale.ROOT);
		boolean extensaoValida = "application/pdf".equals(contentType)
				? lower.endsWith(".pdf")
				: lower.endsWith(".jpg") || lower.endsWith(".jpeg");
		if (!extensaoValida) {
			throw new IllegalArgumentException("Extensão do arquivo não corresponde ao conteúdo");
		}
	}

	private String sanitizar(String nome) {
		String normalizado = Normalizer.normalize(nome, Normalizer.Form.NFD)
				.replaceAll("\\p{M}", "");
		String seguro = normalizado
				.replaceAll("[^a-zA-Z0-9._-]", "-")
				.replaceAll("-+", "-")
				.replaceAll("^[-.]+|[-.]+$", "");
		return seguro.isBlank() ? "arquivo" : seguro;
	}

	private record ArquivoValidado(String nome, String contentType) {
	}
}
