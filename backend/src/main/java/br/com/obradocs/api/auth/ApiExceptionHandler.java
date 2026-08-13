package br.com.obradocs.api.auth;

import java.util.NoSuchElementException;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import br.com.obradocs.api.auth.AuthService.EmailJaCadastradoException;
import br.com.obradocs.api.auth.AuthService.PasswordChangeRequiredException;
import br.com.obradocs.api.auth.AuthRateLimiter.TooManyRequestsException;
import br.com.obradocs.api.arquivo.FormatosExpandidosDesabilitadosException;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
class ApiExceptionHandler {

	@ExceptionHandler(EmailJaCadastradoException.class)
	ProblemDetail emailJaCadastrado(EmailJaCadastradoException exception) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
	}

	@ExceptionHandler(PasswordChangeRequiredException.class)
	ProblemDetail trocaDeSenhaObrigatoria(PasswordChangeRequiredException exception) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, exception.getMessage());
	}

	@ExceptionHandler(BadCredentialsException.class)
	ProblemDetail credenciaisInvalidas(BadCredentialsException exception) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, exception.getMessage());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ProblemDetail dadosInvalidos() {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dados inválidos");
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ProblemDetail corpoInvalido() {
		ProblemDetail detail = ProblemDetail.forStatusAndDetail(
				HttpStatus.BAD_REQUEST,
				"Corpo da requisição inválido");
		detail.setProperty("code", "INVALID_REQUEST");
		return detail;
	}

	@ExceptionHandler(IllegalArgumentException.class)
	ProblemDetail argumentoInvalido(IllegalArgumentException exception) {
		ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
		detail.setProperty("code", "INVALID_REQUEST");
		return detail;
	}

	@ExceptionHandler(NoSuchElementException.class)
	ProblemDetail naoEncontrado(NoSuchElementException exception) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
	}

	@ExceptionHandler(AccessDeniedException.class)
	ProblemDetail acessoNegado(AccessDeniedException exception) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, exception.getMessage());
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	ProblemDetail uploadMuitoGrande() {
		ProblemDetail detail = ProblemDetail.forStatusAndDetail(
				HttpStatus.CONTENT_TOO_LARGE,
				"Arquivo muito grande; limite de 100 MB");
		detail.setProperty("code", "UPLOAD_TOO_LARGE");
		return detail;
	}

	@ExceptionHandler(FormatosExpandidosDesabilitadosException.class)
	ProblemDetail formatosExpandidosDesabilitados(FormatosExpandidosDesabilitadosException exception) {
		ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
		detail.setProperty("code", "FILE_FORMATS_EXTENDED_DISABLED");
		return detail;
	}

	@ExceptionHandler(TooManyRequestsException.class)
	ResponseEntity<ProblemDetail> muitasTentativas(TooManyRequestsException exception) {
		ProblemDetail detail =
				ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, exception.getMessage());
		return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
				.header("Retry-After", Long.toString(exception.retryAfterSeconds()))
				.body(detail);
	}
}
