package br.com.obradocs.api.report;

import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.obradocs.api.obra.ObraAuthorizationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
@Slf4j
class ContentReportController {

	private final JdbcTemplate jdbc;
	private final ObraAuthorizationService authorization;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@Transactional
	void report(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ReportRequest request) {
		UUID reporterId = UUID.fromString(jwt.getSubject());
		UUID obraId = request.targetType() == TargetType.OBRA
				? request.targetId()
				: jdbc.query(
						"select obra_id from arquivos where id = ?",
						result -> result.next() ? result.getObject("obra_id", UUID.class) : null,
						request.targetId());
		if (obraId == null) {
			throw new NoSuchElementException("Arquivo não encontrado");
		}
		authorization.exigirLeitura(obraId, reporterId);

		UUID reportId = UUID.randomUUID();
		jdbc.update("""
				insert into content_reports (
				    id, reporter_id, obra_id, arquivo_id, reason
				) values (?, ?, ?, ?, ?)
				""",
				reportId,
				reporterId,
				request.targetType() == TargetType.OBRA ? obraId : null,
				request.targetType() == TargetType.ARQUIVO ? request.targetId() : null,
				request.reason().trim());
		log.warn(
				"Denúncia de conteúdo recebida: reportId={}, targetType={}, targetId={}",
				reportId,
				request.targetType(),
				request.targetId());
	}

	enum TargetType {
		OBRA,
		ARQUIVO
	}

	record ReportRequest(
			@NotNull TargetType targetType,
			@NotNull UUID targetId,
			@NotBlank @Size(min = 10, max = 1000) String reason) {
	}
}
