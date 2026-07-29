package br.com.obradocs.api.config;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableConfigurationProperties({
		SecurityConfig.JwtProperties.class,
		SecurityConfig.PasswordResetProperties.class,
		SecurityConfig.BrevoProperties.class,
		SecurityConfig.CorsProperties.class
})
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(
			HttpSecurity http,
			CorsConfigurationSource corsConfigurationSource) throws Exception {
		return http
				.csrf(csrf -> csrf.disable())
				.cors(cors -> cors.configurationSource(corsConfigurationSource))
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(
								HttpMethod.POST,
								"/auth/register",
								"/auth/login",
								"/auth/refresh",
								"/auth/logout",
								"/auth/forgot-password",
								"/auth/reset-password")
						.permitAll()
						.requestMatchers(HttpMethod.GET, "/reset-password.html").permitAll()
						.requestMatchers("/actuator/health").permitAll()
						.anyRequest().authenticated())
				.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
				.build();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(properties.allowedOrigins());
		configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", configuration);
		return source;
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(12);
	}

	@Bean
	SecretKey jwtSecretKey(JwtProperties properties) {
		byte[] secret = properties.secret().getBytes(StandardCharsets.UTF_8);
		if (secret.length < 32) {
			throw new IllegalStateException("JWT_SECRET deve possuir pelo menos 32 bytes");
		}
		return new SecretKeySpec(secret, "HmacSHA256");
	}

	@Bean
	JwtEncoder jwtEncoder(SecretKey secretKey) {
		return NimbusJwtEncoder.withSecretKey(secretKey)
				.algorithm(MacAlgorithm.HS256)
				.build();
	}

	@Bean
	JwtDecoder jwtDecoder(SecretKey secretKey) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey)
				.macAlgorithm(MacAlgorithm.HS256)
				.build();
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<Jwt>(
				JwtValidators.createDefaultWithIssuer("obradocs-api")));
		return decoder;
	}

	@ConfigurationProperties("app.jwt")
	public record JwtProperties(String secret, Duration accessTokenTtl, Duration refreshTokenTtl) {

		public JwtProperties {
			if (secret == null || secret.isBlank()) {
				throw new IllegalStateException("JWT_SECRET deve ser informado");
			}
			if (accessTokenTtl == null || accessTokenTtl.isNegative() || accessTokenTtl.isZero()) {
				throw new IllegalStateException("JWT_ACCESS_TOKEN_TTL deve ser positivo");
			}
			if (refreshTokenTtl == null || refreshTokenTtl.isNegative() || refreshTokenTtl.isZero()) {
				throw new IllegalStateException("JWT_REFRESH_TOKEN_TTL deve ser positivo");
			}
		}
	}

	@ConfigurationProperties("app.password-reset")
	public record PasswordResetProperties(String url, Duration tokenTtl, String from) {

		public PasswordResetProperties {
			if (url == null || url.isBlank()) {
				throw new IllegalStateException("PASSWORD_RESET_URL deve ser informado");
			}
			if (tokenTtl == null || tokenTtl.isNegative() || tokenTtl.isZero()) {
				throw new IllegalStateException("PASSWORD_RESET_TOKEN_TTL deve ser positivo");
			}
			if (from == null || from.isBlank()) {
				throw new IllegalStateException("PASSWORD_RESET_FROM deve ser informado");
			}
		}
	}

	@ConfigurationProperties("app.brevo")
	public record BrevoProperties(URI apiUrl, String apiKey) {

		public BrevoProperties {
			if (apiUrl == null) {
				throw new IllegalStateException("BREVO_API_URL deve ser informada");
			}
			if (apiKey == null || apiKey.isBlank()) {
				throw new IllegalStateException("BREVO_API_KEY deve ser informada");
			}
		}
	}

	@ConfigurationProperties("app.cors")
	public record CorsProperties(List<String> allowedOrigins) {

		public CorsProperties {
			if (allowedOrigins == null || allowedOrigins.isEmpty()) {
				throw new IllegalStateException("CORS_ALLOWED_ORIGINS deve ser informado");
			}
		}
	}
}
