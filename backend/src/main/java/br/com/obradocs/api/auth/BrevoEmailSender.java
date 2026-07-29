package br.com.obradocs.api.auth;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import br.com.obradocs.api.config.SecurityConfig.BrevoProperties;
import br.com.obradocs.api.config.SecurityConfig.PasswordResetProperties;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
class BrevoEmailSender {

	private final ObjectMapper json;
	private final BrevoProperties properties;
	private final PasswordResetProperties passwordResetProperties;
	private final HttpClient http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10))
			.build();

	void enviarRedefinicao(Usuario usuario, String link) {
		String safeName = HtmlUtils.htmlEscape(usuario.getNome());
		String safeLink = HtmlUtils.htmlEscape(link);
		Map<String, Object> email = Map.of(
				"sender", Map.of("email", passwordResetProperties.from(), "name", "Obradocs"),
				"to", List.of(Map.of("email", usuario.getEmail(), "name", usuario.getNome())),
				"subject", "Redefinicao de senha do Obradocs",
				"htmlContent", """
						<p>Ola, %s.</p>
						<p>Use o botao abaixo para definir uma nova senha:</p>
						<p><a href="%s" style="background:#0C5BAA;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">Redefinir senha</a></p>
						<p>Se voce nao solicitou a redefinicao, ignore esta mensagem.</p>
						""".formatted(safeName, safeLink),
				"textContent", """
						Ola, %s.

						Use o link abaixo para definir uma nova senha:
						%s

						Se voce nao solicitou a redefinicao, ignore esta mensagem.
						""".formatted(usuario.getNome(), link));
		try {
			HttpRequest request = HttpRequest.newBuilder(properties.apiUrl())
					.timeout(Duration.ofSeconds(15))
					.header("Accept", "application/json")
					.header("Content-Type", "application/json")
					.header("api-key", properties.apiKey())
					.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(email)))
					.build();
			HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() < 200 || response.statusCode() >= 300) {
				throw new EmailDeliveryException("Brevo respondeu HTTP " + response.statusCode());
			}
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new EmailDeliveryException("Envio de e-mail interrompido", exception);
		} catch (IOException exception) {
			throw new EmailDeliveryException("Falha ao chamar a API da Brevo", exception);
		}
	}

	static class EmailDeliveryException extends RuntimeException {
		EmailDeliveryException(String message) {
			super(message);
		}

		EmailDeliveryException(String message, Throwable cause) {
			super(message, cause);
		}
	}
}
