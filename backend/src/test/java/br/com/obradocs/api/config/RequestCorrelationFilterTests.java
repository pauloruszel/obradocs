package br.com.obradocs.api.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestCorrelationFilterTests {

	private final RequestCorrelationFilter filter = new RequestCorrelationFilter();

	@Test
	void geraIdentificadorQuandoCabecalhoNaoFoiEnviado() throws Exception {
		MockHttpServletResponse response = execute(new MockHttpServletRequest("GET", "/health"));

		assertThat(response.getHeader(RequestCorrelationFilter.HEADER)).isNotBlank();
		assertThat(MDC.get(RequestCorrelationFilter.MDC_KEY)).isNull();
	}

	@Test
	void preservaIdentificadorValidoRecebido() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
		request.addHeader(RequestCorrelationFilter.HEADER, "request-12345678");

		assertThat(execute(request).getHeader(RequestCorrelationFilter.HEADER))
				.isEqualTo("request-12345678");
	}

	@Test
	void substituiIdentificadorInvalido() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
		request.addHeader(RequestCorrelationFilter.HEADER, "token=segredo");

		assertThat(execute(request).getHeader(RequestCorrelationFilter.HEADER))
				.isNotEqualTo("token=segredo")
				.matches("[A-Za-z0-9._-]{8,64}");
	}

	private MockHttpServletResponse execute(MockHttpServletRequest request) throws Exception {
		MockHttpServletResponse response = new MockHttpServletResponse();
		filter.doFilter(request, response, new MockFilterChain());
		return response;
	}
}
