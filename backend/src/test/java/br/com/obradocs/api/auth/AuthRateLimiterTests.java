package br.com.obradocs.api.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class AuthRateLimiterTests {

	@Test
	void bloqueiaAoUltrapassarLimiteDaJanela() {
		AuthRateLimiter limiter =
				new AuthRateLimiter(Clock.fixed(Instant.parse("2026-07-29T12:00:00Z"), ZoneOffset.UTC));

		limiter.check("login:ip:127.0.0.1", 2, Duration.ofMinutes(1));
		limiter.check("login:ip:127.0.0.1", 2, Duration.ofMinutes(1));

		assertThatThrownBy(() ->
				limiter.check("login:ip:127.0.0.1", 2, Duration.ofMinutes(1)))
				.isInstanceOf(AuthRateLimiter.TooManyRequestsException.class)
				.hasMessageContaining("Muitas tentativas");
	}
}
