package br.com.obradocs.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Component;

@Component
public class AuthRateLimiter {

	private static final int MAX_KEYS = 10_000;

	// ponytail: armazenamento local atende uma réplica; use Redis antes de escalar horizontalmente.
	private final Map<String, Window> windows = new ConcurrentHashMap<>();
	private final Clock clock;
	private final AtomicLong requests = new AtomicLong();

	AuthRateLimiter() {
		this(Clock.systemUTC());
	}

	AuthRateLimiter(Clock clock) {
		this.clock = clock;
	}

	public void check(String key, int limit, Duration duration) {
		Instant now = clock.instant();
		if (requests.incrementAndGet() % 100 == 0 || windows.size() > MAX_KEYS) {
			windows.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
		}

		Window window = windows.compute(key, (ignored, current) -> {
			if (current == null || !current.expiresAt().isAfter(now)) {
				return new Window(1, now.plus(duration));
			}
			return new Window(current.count() + 1, current.expiresAt());
		});
		if (window.count() > limit) {
			throw new TooManyRequestsException(
					Math.max(1, Duration.between(now, window.expiresAt()).toSeconds()));
		}
	}

	record Window(int count, Instant expiresAt) {
	}

	static class TooManyRequestsException extends RuntimeException {

		private final long retryAfterSeconds;

		TooManyRequestsException(long retryAfterSeconds) {
			super("Muitas tentativas. Aguarde antes de tentar novamente.");
			this.retryAfterSeconds = retryAfterSeconds;
		}

		long retryAfterSeconds() {
			return retryAfterSeconds;
		}
	}
}
