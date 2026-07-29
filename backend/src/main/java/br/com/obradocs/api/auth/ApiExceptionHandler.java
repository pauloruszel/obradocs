package br.com.obradocs.api.auth;

import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import br.com.obradocs.api.auth.AuthService.EmailJaCadastradoException;
import br.com.obradocs.api.auth.AuthService.PasswordChangeRequiredException;

@RestControllerAdvice
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
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dados invalidos");
	}

	@ExceptionHandler(IllegalArgumentException.class)
	ProblemDetail argumentoInvalido(IllegalArgumentException exception) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
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
		return ProblemDetail.forStatusAndDetail(
				HttpStatus.CONTENT_TOO_LARGE,
				"Arquivo muito grande; limite de 10 MB");
	}
}
