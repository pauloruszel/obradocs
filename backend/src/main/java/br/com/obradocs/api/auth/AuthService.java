package br.com.obradocs.api.auth;

import java.util.Locale;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthService {

	private final UsuarioRepository usuarios;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	AuthService(UsuarioRepository usuarios, PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.usuarios = usuarios;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	@Transactional
	AuthResult cadastrar(String nome, String email, String senha) {
		String normalizedEmail = normalizeEmail(email);
		if (usuarios.existsByEmail(normalizedEmail)) {
			throw new EmailJaCadastradoException();
		}

		try {
			Usuario usuario = usuarios.saveAndFlush(
					new Usuario(nome.trim(), normalizedEmail, passwordEncoder.encode(senha)));
			return new AuthResult(usuario, jwtService.emitir(usuario));
		} catch (DataIntegrityViolationException exception) {
			throw new EmailJaCadastradoException();
		}
	}

	@Transactional(readOnly = true)
	AuthResult autenticar(String email, String senha) {
		Usuario usuario = usuarios.findByEmail(normalizeEmail(email))
				.filter(Usuario::isAtivo)
				.orElseThrow(() -> new BadCredentialsException("E-mail ou senha invalidos"));
		if (!passwordEncoder.matches(senha, usuario.getSenhaHash())) {
			throw new BadCredentialsException("E-mail ou senha invalidos");
		}
		return new AuthResult(usuario, jwtService.emitir(usuario));
	}

	@Transactional(readOnly = true)
	Usuario buscar(UUID id) {
		return usuarios.findById(id)
				.filter(Usuario::isAtivo)
				.orElseThrow(() -> new BadCredentialsException("Usuario nao encontrado"));
	}

	private String normalizeEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	record AuthResult(Usuario usuario, JwtService.Token token) {
	}

	static class EmailJaCadastradoException extends RuntimeException {
		EmailJaCadastradoException() {
			super("E-mail ja cadastrado");
		}
	}
}
