package br.com.obradocs.api.auth;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
class AuthController {

	private final AuthService authService;
	private final AuthRateLimiter rateLimiter;

	@PostMapping("/register")
	ResponseEntity<AuthResponse> register(
			@Valid @RequestBody RegisterRequest request,
			HttpServletRequest httpRequest) {
		limit(httpRequest, "register", 5, Duration.ofHours(1));
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(AuthResponse.from(authService.cadastrar(request.nome(), request.email(), request.senha())));
	}

	@PostMapping("/login")
	AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
		limit(httpRequest, "login", 20, Duration.ofMinutes(5));
		rateLimiter.check(
				"login:account:" + request.email().trim().toLowerCase(Locale.ROOT),
				10,
				Duration.ofMinutes(5));
		return AuthResponse.from(authService.autenticar(request.email(), request.senha()));
	}

	@PostMapping("/refresh")
	AuthResponse refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
		limit(httpRequest, "refresh", 60, Duration.ofMinutes(5));
		return AuthResponse.from(authService.renovar(request.refreshToken()));
	}

	@PostMapping("/logout")
	ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest request) {
		authService.sair(request.refreshToken());
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/forgot-password")
	ResponseEntity<Void> forgotPassword(
			@Valid @RequestBody ForgotPasswordRequest request,
			HttpServletRequest httpRequest) {
		limit(httpRequest, "forgot-password", 5, Duration.ofMinutes(15));
		rateLimiter.check(
				"forgot-password:account:" + request.email().trim().toLowerCase(Locale.ROOT),
				3,
				Duration.ofMinutes(15));
		authService.solicitarRedefinicao(request.email());
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/reset-password")
	ResponseEntity<Void> resetPassword(
			@Valid @RequestBody ResetPasswordRequest request,
			HttpServletRequest httpRequest) {
		limit(httpRequest, "reset-password", 10, Duration.ofMinutes(15));
		authService.redefinirSenha(request.token(), request.senha());
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/me")
	UsuarioResponse me(@AuthenticationPrincipal Jwt jwt) {
		return UsuarioResponse.from(authService.buscar(UUID.fromString(jwt.getSubject())));
	}

	@DeleteMapping("/account")
	ResponseEntity<Void> deleteAccount(
			@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody DeleteAccountRequest request,
			HttpServletRequest httpRequest) {
		limit(httpRequest, "delete-account", 5, Duration.ofHours(1));
		authService.excluirConta(UUID.fromString(jwt.getSubject()), request.senha());
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/accept-terms")
	UsuarioResponse acceptTerms(@AuthenticationPrincipal Jwt jwt) {
		return UsuarioResponse.from(authService.aceitarTermos(UUID.fromString(jwt.getSubject())));
	}

	private void limit(HttpServletRequest request, String operation, int limit, Duration duration) {
		rateLimiter.check(operation + ":ip:" + request.getRemoteAddr(), limit, duration);
	}

	record RegisterRequest(
			@NotBlank @Size(min = 2, max = 150) String nome,
			@NotBlank @Email @Size(max = 320) String email,
			@NotBlank @Size(min = 8, max = 72) String senha,
			@AssertTrue(message = "Aceite os Termos de Uso e a Política de Privacidade")
			boolean aceitouTermos) {
	}

	record LoginRequest(
			@NotBlank @Email @Size(max = 320) String email,
			@NotBlank @Size(min = 6, max = 72) String senha) {
	}

	record RefreshRequest(@NotBlank String refreshToken) {
	}

	record ForgotPasswordRequest(@NotBlank @Email @Size(max = 320) String email) {
	}

	record ResetPasswordRequest(
			@NotBlank String token,
			@NotBlank @Size(min = 8, max = 72) String senha) {
	}

	record DeleteAccountRequest(@NotBlank @Size(min = 6, max = 72) String senha) {
	}

	record AuthResponse(
			String accessToken,
			String refreshToken,
			String tokenType,
			long expiresIn,
			UsuarioResponse user) {

		static AuthResponse from(AuthService.AuthResult result) {
			long expiresIn = Instant.now().until(result.token().expiresAt(), ChronoUnit.SECONDS);
			return new AuthResponse(
					result.token().value(),
					result.refreshToken(),
					"Bearer",
					expiresIn,
					UsuarioResponse.from(result.usuario()));
		}
	}

	record UsuarioResponse(
			UUID id,
			String nome,
			String email,
			boolean ativo,
			boolean termsAccepted,
			Instant createdAt) {

		static UsuarioResponse from(Usuario usuario) {
			return new UsuarioResponse(
					usuario.getId(),
					usuario.getNome(),
					usuario.getEmail(),
					usuario.isAtivo(),
					usuario.getTermsAcceptedAt() != null,
					usuario.getCreatedAt());
		}
	}
}
