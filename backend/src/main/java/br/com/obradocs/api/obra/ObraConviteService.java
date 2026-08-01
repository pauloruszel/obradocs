package br.com.obradocs.api.obra;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.obradocs.api.auth.BrevoEmailSender;
import br.com.obradocs.api.config.SecurityConfig.InvitationProperties;
import br.com.obradocs.api.plano.PlanoLimiteService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
class ObraConviteService {

	private static final SecureRandom RANDOM = new SecureRandom();

	private final ObraConviteRepository convites;
	private final ObraRepository obras;
	private final PermissaoRepository permissoes;
	private final ObraAuthorizationService authorization;
	private final PlanoLimiteService limitesPlano;
	private final HistoricoService historico;
	private final BrevoEmailSender emailSender;
	private final InvitationProperties properties;

	@Transactional
	ObraConvite criar(UUID obraId, String email, Papel papel, UUID usuarioId) {
		Obra obra = buscarObra(obraId);
		authorization.exigirOwner(obraId, usuarioId);
		if (papel == Papel.OWNER) {
			throw new IllegalArgumentException("O convite não pode conceder acesso de proprietário");
		}
		String emailNormalizado = email.trim().toLowerCase(Locale.ROOT);
		permissoes.buscarUsuarioIdPorEmail(emailNormalizado)
				.flatMap(id -> permissoes.findByObraIdAndUserId(obraId, id))
				.ifPresent(item -> {
					throw new ResponseStatusException(HttpStatus.CONFLICT, "A pessoa já possui acesso à obra");
				});
		if (convites.findByObraIdAndEmailIgnoreCaseAndStatus(
				obraId, emailNormalizado, ObraConvite.Status.PENDING).isPresent()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um convite pendente para este e-mail");
		}

		String token = gerarToken();
		ObraConvite convite = new ObraConvite(
				obraId,
				emailNormalizado,
				papel,
				hash(token),
				Instant.now().plus(properties.tokenTtl()),
				usuarioId);
		try {
			convites.saveAndFlush(convite);
		} catch (DataIntegrityViolationException exception) {
			throw new ResponseStatusException(
					HttpStatus.CONFLICT, "Já existe um convite pendente para este e-mail", exception);
		}
		emailSender.enviarConvite(
				emailNormalizado,
				obra.getNome(),
				papel,
				properties.url() + URLEncoder.encode(token, StandardCharsets.UTF_8));
		return convite;
	}

	@Transactional
	List<ObraConvite> listar(UUID obraId, UUID usuarioId) {
		buscarObra(obraId);
		authorization.exigirOwner(obraId, usuarioId);
		List<ObraConvite> resultado = convites.findAllByObraIdOrderByCreatedAtDesc(obraId);
		Instant now = Instant.now();
		resultado.forEach(convite -> convite.expirar(now));
		return resultado;
	}

	@Transactional
	ObraConvite revogar(UUID obraId, UUID conviteId, UUID usuarioId) {
		buscarObra(obraId);
		authorization.exigirOwner(obraId, usuarioId);
		ObraConvite convite = convites.findByIdAndObraId(conviteId, obraId)
				.orElseThrow(() -> new NoSuchElementException("Convite não encontrado"));
		convite.expirar(Instant.now());
		if (convite.getStatus() != ObraConvite.Status.PENDING) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Somente convites pendentes podem ser revogados");
		}
		convite.revogar();
		return convite;
	}

	@Transactional(noRollbackFor = ResponseStatusException.class)
	Obra aceitar(String token, UUID usuarioId) {
		ObraConvite convite = convites.findByTokenHash(hash(token))
				.orElseThrow(() -> new NoSuchElementException("Convite inválido"));
		Instant now = Instant.now();
		if (convite.expirar(now)) {
			throw new ResponseStatusException(HttpStatus.GONE, "Convite expirado");
		}
		if (convite.getStatus() != ObraConvite.Status.PENDING) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Convite já utilizado ou revogado");
		}
		String emailUsuario = permissoes.buscarUsuario(usuarioId)
				.map(PermissaoRepository.UsuarioResumo::getEmail)
				.orElseThrow(() -> new NoSuchElementException("Usuário não encontrado"));
		if (!convite.getEmail().equalsIgnoreCase(emailUsuario)) {
			throw new AccessDeniedException("Este convite pertence a outro e-mail");
		}
		Obra obra = buscarObra(convite.getObraId());
		if (permissoes.findByObraIdAndUserId(obra.getId(), usuarioId).isPresent()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "A pessoa já possui acesso à obra");
		}
		limitesPlano.validarNovoColaborador(obra.getId(), usuarioId);
		permissoes.save(new Permissao(obra.getId(), usuarioId, convite.getPapel()));
		convite.aceitar(usuarioId, now);
		historico.registrar(
				obra.getId(),
				usuarioId,
				"ENTROU_OBRA",
				Map.of("papel", convite.getPapel().name(), "via", "CONVITE_EMAIL"));
		return obra;
	}

	private Obra buscarObra(UUID obraId) {
		return obras.findByIdAndDeletedAtIsNull(obraId)
				.orElseThrow(() -> new NoSuchElementException("Obra não encontrada"));
	}

	private String gerarToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String hash(String token) {
		try {
			return HexFormat.of().formatHex(
					MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 indisponível", exception);
		}
	}
}
