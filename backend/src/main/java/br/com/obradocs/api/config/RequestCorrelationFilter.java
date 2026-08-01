package br.com.obradocs.api.config;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequestCorrelationFilter extends OncePerRequestFilter {

	static final String HEADER = "X-Request-ID";
	static final String MDC_KEY = "requestId";
	private static final Pattern VALID_REQUEST_ID = Pattern.compile("[A-Za-z0-9._-]{8,64}");
	private static final Logger log = LoggerFactory.getLogger(RequestCorrelationFilter.class);

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		String requestId = requestId(request.getHeader(HEADER));
		long startedAt = System.nanoTime();
		MDC.put(MDC_KEY, requestId);
		response.setHeader(HEADER, requestId);
		try {
			filterChain.doFilter(request, response);
		} finally {
			long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
			log.info("http_request method={} path={} status={} duration_ms={}",
					request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs);
			MDC.remove(MDC_KEY);
		}
	}

	private String requestId(String candidate) {
		return candidate != null && VALID_REQUEST_ID.matcher(candidate).matches()
				? candidate
				: UUID.randomUUID().toString();
	}
}
