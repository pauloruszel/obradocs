package br.com.obradocs.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.server.ResponseStatusException;

class ApiExceptionHandlerTests {

	@Test
	void preservaStatusDeErroHttpConhecido() {
		var response = new UnexpectedExceptionHandler().preserveHttpError(
				new ResponseStatusException(HttpStatus.CONFLICT, "Conflito conhecido"));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(response.getBody()).isNotNull();
		assertThat(response.getBody().getDetail()).isEqualTo("Conflito conhecido");
	}

	@Test
	void ocultaDetalhesDoErroInesperadoEInformaRequestId() {
		MDC.put("requestId", "request-12345678");
		try {
			ProblemDetail detail = new UnexpectedExceptionHandler().handle(
					new IllegalStateException("segredo interno"));

			assertThat(detail.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
			assertThat(detail.getDetail()).doesNotContain("segredo interno");
			assertThat(detail.getProperties()).containsEntry("request_id", "request-12345678");
		} finally {
			MDC.clear();
		}
	}
}
