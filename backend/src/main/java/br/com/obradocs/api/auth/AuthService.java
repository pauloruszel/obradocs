package br.com.obradocs.api.auth;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.obradocs.api.config.SecurityConfig.JwtProperties;
import br.com.obradocs.api.config.SecurityConfig.PasswordResetProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
class AuthService {

	private static final SecureRandom RANDOM = new SecureRandom();

	private final UsuarioRepository usuarios;
	private final RefreshTokenRepository refreshTokens;
	private final PasswordResetTokenRepository passwordResetTokens;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final JwtProperties jwtProperties;
	private final PasswordResetProperties passwordResetProperties;
	private final BrevoEmailSender emailSender;
	private final Clock clock = Clock.systemUTC();

	@Transactional
	AuthResult cadastrar(String nome, String email, String senha) {
		String normalizedEmail = normalizeEmail(email);
		if (usuarios.existsByEmail(normalizedEmail)) {
			throw new EmailJaCadastradoException();
		}

		try {
			Usuario usuario = usuarios.saveAndFlush(
					new Usuario(nome.trim(), normalizedEmail, passwordEncoder.encode(senha)));
			return criarSessao(usuario);
		} catch (DataIntegrityViolationException exception) {
			throw new EmailJaCadastradoException();
		}
	}

	@Transactional(readOnly = true)
	AuthResult autenticar(String email, String senha) {
		Usuario usuario = usuarios.findByEmail(normalizeEmail(email))
				.filter(Usuario::isAtivo)
				.orElseThrow(() -> new BadCredentialsException("E-mail ou senha invalidos"));
		if (usuario.isPasswordChangeRequired()) {
			throw new PasswordChangeRequiredException();
		}
		if (!passwordEncoder.matches(senha, usuario.getSenhaHash())) {
			throw new BadCredentialsException("E-mail ou senha invalidos");
		}
		return criarSessao(usuario);
	}

	@Transactional(readOnly = true)
	Usuario buscar(UUID id) {
		return usuarios.findById(id)
				.filter(Usuario::isAtivo)
				.orElseThrow(() -> new BadCredentialsException("Usuario nao encontrado"));
	}

	@Transactional
	AuthResult renovar(String refreshToken) {
		Instant now = clock.instant();
		RefreshToken atual = refreshTokens.findByTokenHashAndRevokedAtIsNull(hash(refreshToken))
				.filter(token -> !token.expirado(now))
				.orElseThrow(() -> new BadCredentialsException("Sessao invalida ou expirada"));
		Usuario usuario = buscar(atual.getUsuarioId());
		atual.revogar(now);
		return criarSessao(usuario);
	}

	@Transactional
	void sair(String refreshToken) {
		refreshTokens.findByTokenHashAndRevokedAtIsNull(hash(refreshToken))
				.ifPresent(token -> token.revogar(clock.instant()));
	}

	@Transactional
	void solicitarRedefinicao(String email) {
		usuarios.findByEmail(normalizeEmail(email))
				.filter(Usuario::isAtivo)
				.ifPresent(this::criarRedefinicao);
	}

	@Transactional
	void redefinirSenha(String token, String senha) {
		Instant now = clock.instant();
		PasswordResetToken resetToken =
				passwordResetTokens.findByTokenHashAndUsedAtIsNull(hash(token))
						.filter(item -> !item.expirado(now))
						.orElseThrow(() -> new IllegalArgumentException("Token invalido ou expirado"));
		Usuario usuario = usuarios.findById(resetToken.getUsuarioId())
				.filter(Usuario::isAtivo)
				.orElseThrow(() -> new IllegalArgumentException("Token invalido ou expirado"));

		usuario.alterarSenha(passwordEncoder.encode(senha));
		resetToken.usar(now);
		refreshTokens.findAllByUsuarioIdAndRevokedAtIsNull(usuario.getId())
				.forEach(item -> item.revogar(now));
	}

	private AuthResult criarSessao(Usuario usuario) {
		String refreshToken = gerarToken();
		refreshTokens.save(new RefreshToken(
				usuario.getId(),
				hash(refreshToken),
				clock.instant().plus(jwtProperties.refreshTokenTtl())));
		return new AuthResult(usuario, jwtService.emitir(usuario), refreshToken);
	}

	private void criarRedefinicao(Usuario usuario) {
		Instant now = clock.instant();
		passwordResetTokens.findAllByUsuarioIdAndUsedAtIsNull(usuario.getId())
				.forEach(token -> token.usar(now));

		String token = gerarToken();
		passwordResetTokens.save(new PasswordResetToken(
				usuario.getId(),
				hash(token),
				now.plus(passwordResetProperties.tokenTtl())));
		enviarEmailRedefinicao(usuario, token);
	}

	private void enviarEmailRedefinicao(Usuario usuario, String token) {
		String separator = passwordResetProperties.url().contains("?") ? "&" : "?";
		String link = passwordResetProperties.url()
				+ separator
				+ "token="
				+ URLEncoder.encode(token, StandardCharsets.UTF_8);
		try {
			emailSender.enviarRedefinicao(usuario, link);
		} catch (BrevoEmailSender.EmailDeliveryException exception) {
			log.error("Falha ao enviar redefinicao de senha para usuario {}", usuario.getId(), exception);
		}
	}

	private String gerarToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String hash(String token) {
		if (token == null || token.isBlank()) {
			throw new BadCredentialsException("Token obrigatorio");
		}
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256")
					.digest(token.getBytes(StandardCharsets.UTF_8));
			return java.util.HexFormat.of().formatHex(digest);
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 indisponivel", exception);
		}
	}

	private String normalizeEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	record AuthResult(Usuario usuario, JwtService.Token token, String refreshToken) {
	}

	static class EmailJaCadastradoException extends RuntimeException {
		EmailJaCadastradoException() {
			super("E-mail ja cadastrado");
		}
	}

	static class PasswordChangeRequiredException extends RuntimeException {
		PasswordChangeRequiredException() {
			super("Redefinicao de senha obrigatoria. Use Esqueci minha senha.");
		}
	}
}
