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
		long ttlMinutes = Math.max(1, passwordResetProperties.tokenTtl().toMinutes());
		String expiration = ttlMinutes + (ttlMinutes == 1 ? " minuto" : " minutos");
		String htmlContent = """
				<!doctype html>
				<html lang="pt-BR">
				<head>
				  <meta charset="utf-8">
				  <meta name="viewport" content="width=device-width, initial-scale=1">
				  <title>Redefinir senha | Obradocs</title>
				</head>
				<body style="margin:0;padding:0;background:#f4f6f8;color:#172033;font-family:Arial,sans-serif">
				  <div style="display:none;max-height:0;overflow:hidden;opacity:0">
				    Recebemos uma solicita&ccedil;&atilde;o para redefinir sua senha no Obradocs.
				  </div>
				  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8">
				    <tr>
				      <td align="center" style="padding:32px 16px">
				        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #dfe4ea;border-radius:8px">
				          <tr>
				            <td style="padding:24px 32px;background:#0c5baa;border-radius:8px 8px 0 0">
				              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
				                <tr>
				                  <td align="center" width="42" height="42" style="background:#ffffff;border-radius:21px;color:#0c5baa;font-size:25px;font-weight:700">O</td>
				                  <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:700">Obradocs</td>
				                </tr>
				              </table>
				            </td>
				          </tr>
				          <tr>
				            <td style="padding:36px 32px 18px">
				              <p style="margin:0 0 12px;color:#0c5baa;font-size:13px;font-weight:700;text-transform:uppercase">Seguran&ccedil;a da conta</p>
				              <h1 style="margin:0 0 18px;color:#172033;font-size:26px;line-height:1.25">Defina uma nova senha</h1>
				              <p style="margin:0 0 14px;color:#445066;font-size:16px;line-height:1.6">Ol&aacute;, {{name}}.</p>
				              <p style="margin:0;color:#445066;font-size:16px;line-height:1.6">Recebemos uma solicita&ccedil;&atilde;o para redefinir a senha da sua conta. Use o bot&atilde;o abaixo para continuar.</p>
				            </td>
				          </tr>
				          <tr>
				            <td style="padding:10px 32px 26px">
				              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
				                <tr>
				                  <td align="center" bgcolor="#0c5baa" style="border-radius:6px">
				                    <a href="{{link}}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none">Redefinir minha senha</a>
				                  </td>
				                </tr>
				              </table>
				            </td>
				          </tr>
				          <tr>
				            <td style="padding:0 32px 26px">
				              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef5fb;border-left:4px solid #0c5baa">
				                <tr>
				                  <td style="padding:14px 16px;color:#344258;font-size:14px;line-height:1.5">Este link expira em <strong>{{expiration}}</strong> e pode ser usado apenas uma vez.</td>
				                </tr>
				              </table>
				            </td>
				          </tr>
				          <tr>
				            <td style="padding:0 32px 32px;color:#637083;font-size:13px;line-height:1.55">
				              <p style="margin:0 0 8px">Se o bot&atilde;o n&atilde;o funcionar, copie e cole este endere&ccedil;o no navegador:</p>
				              <p style="margin:0;word-break:break-all"><a href="{{link}}" style="color:#0c5baa;text-decoration:underline">{{link}}</a></p>
				              <hr style="margin:28px 0 20px;border:0;border-top:1px solid #e3e7ec">
				              <p style="margin:0"><strong>N&atilde;o solicitou esta altera&ccedil;&atilde;o?</strong><br>Ignore este e-mail. Sua senha atual permanecer&aacute; a mesma.</p>
				            </td>
				          </tr>
				        </table>
				        <p style="margin:18px 0 0;color:#7b8798;font-size:12px;line-height:1.5;text-align:center">Mensagem autom&aacute;tica do Obradocs. N&atilde;o responda a este e-mail.</p>
				      </td>
				    </tr>
				  </table>
				</body>
				</html>
				"""
				.replace("{{name}}", safeName)
				.replace("{{link}}", safeLink)
				.replace("{{expiration}}", expiration);
		Map<String, Object> email = Map.of(
				"sender", Map.of("email", passwordResetProperties.from(), "name", "Obradocs"),
				"to", List.of(Map.of("email", usuario.getEmail(), "name", usuario.getNome())),
				"subject", "Redefina sua senha | Obradocs",
				"htmlContent", htmlContent,
				"textContent", """
						Olá, %s.

						Use o link abaixo para definir uma nova senha. Ele expira em %s:
						%s

						Se você não solicitou a redefinição, ignore esta mensagem.
						""".formatted(usuario.getNome(), expiration, link));
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
