package br.com.obradocs.api.obra;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "historico")
class Historico {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "obra_id", nullable = false, updatable = false)
	private UUID obraId;

	@Column(name = "user_id", updatable = false)
	private UUID userId;

	@Column(nullable = false, updatable = false, length = 50)
	private String acao;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb", updatable = false)
	private Map<String, Object> detalhes;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected Historico() {
	}

	Historico(UUID obraId, UUID userId, String acao, Map<String, Object> detalhes) {
		this.obraId = obraId;
		this.userId = userId;
		this.acao = acao;
		this.detalhes = detalhes;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
	}

	UUID getId() {
		return id;
	}

	UUID getObraId() {
		return obraId;
	}

	UUID getUserId() {
		return userId;
	}

	String getAcao() {
		return acao;
	}

	Map<String, Object> getDetalhes() {
		return detalhes;
	}

	Instant getCreatedAt() {
		return createdAt;
	}
}
