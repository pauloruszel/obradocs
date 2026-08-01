package br.com.obradocs.api.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Order(Ordered.LOWEST_PRECEDENCE)
class UnexpectedExceptionHandler {
	private static final Logger log = LoggerFactory.getLogger(UnexpectedExceptionHandler.class);

	@ExceptionHandler(ErrorResponseException.class)
	ResponseEntity<ProblemDetail> preserveHttpError(ErrorResponseException exception) {
		return ResponseEntity.status(exception.getStatusCode())
				.headers(exception.getHeaders())
				.body(exception.getBody());
	}

	@ExceptionHandler(Exception.class)
	ProblemDetail handle(Exception exception) {
		String requestId = MDC.get("requestId");
		log.error("unhandled_exception", exception);
		ProblemDetail detail = ProblemDetail.forStatusAndDetail(
				HttpStatus.INTERNAL_SERVER_ERROR,
				"Erro interno. Tente novamente mais tarde");
		detail.setProperty("request_id", requestId);
		return detail;
	}
}
