package br.com.obradocs.api.plano;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class LimitePlanoExceptionHandler {

    @ExceptionHandler(LimitePlanoException.class)
    ResponseEntity<LimitePlanoError> handle(LimitePlanoException exception) {
        return ResponseEntity.status(exception.getStatus()).body(new LimitePlanoError(
                exception.getCode(),
                exception.getMessage(),
                exception.getDetails(),
                Instant.now()));
    }

    record LimitePlanoError(
            String code,
            String message,
            Map<String, Object> details,
            Instant timestamp) {
    }
}
