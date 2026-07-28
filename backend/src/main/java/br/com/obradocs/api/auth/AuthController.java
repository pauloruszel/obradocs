package br.com.obradocs.api.auth;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/auth")
class AuthController {

	private final AuthService authService;

	AuthController(AuthService authService) {
		this.authService = authService;
	}

	@PostMapping("/register")
	ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(AuthResponse.from(authService.cadastrar(request.nome(), request.email(), request.senha())));
	}

	@PostMapping("/login")
	AuthResponse login(@Valid @RequestBody LoginRequest request) {
		return AuthResponse.from(authService.autenticar(request.email(), request.senha()));
	}

	@GetMapping("/me")
	UsuarioResponse me(@AuthenticationPrincipal Jwt jwt) {
		return UsuarioResponse.from(authService.buscar(UUID.fromString(jwt.getSubject())));
	}

	record RegisterRequest(
			@NotBlank @Size(min = 2, max = 150) String nome,
			@NotBlank @Email @Size(max = 320) String email,
			@NotBlank @Size(min = 6, max = 72) String senha) {
	}

	record LoginRequest(
			@NotBlank @Email @Size(max = 320) String email,
			@NotBlank @Size(min = 6, max = 72) String senha) {
	}

	record AuthResponse(String accessToken, String tokenType, long expiresIn, UsuarioResponse user) {

		static AuthResponse from(AuthService.AuthResult result) {
			long expiresIn = Instant.now().until(result.token().expiresAt(), ChronoUnit.SECONDS);
			return new AuthResponse(result.token().value(), "Bearer", expiresIn, UsuarioResponse.from(result.usuario()));
		}
	}

	record UsuarioResponse(UUID id, String nome, String email, boolean ativo, Instant createdAt) {

		static UsuarioResponse from(Usuario usuario) {
			return new UsuarioResponse(
					usuario.getId(),
					usuario.getNome(),
					usuario.getEmail(),
					usuario.isAtivo(),
					usuario.getCreatedAt());
		}
	}
}
