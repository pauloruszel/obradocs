package br.com.obradocs.api.obra;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
		name = "permissoes",
		uniqueConstraints = @UniqueConstraint(name = "uk_permissoes_obra_usuario", columnNames = {"obra_id", "user_id"}))
class Permissao {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "obra_id", nullable = false, updatable = false)
	private UUID obraId;

	@Column(name = "user_id", nullable = false, updatable = false)
	private UUID userId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Papel papel;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected Permissao() {
	}

	Permissao(UUID obraId, UUID userId, Papel papel) {
		this.obraId = obraId;
		this.userId = userId;
		this.papel = papel;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
	}

	void alterarPapel(Papel papel) {
		this.papel = papel;
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

	Papel getPapel() {
		return papel;
	}

	Instant getCreatedAt() {
		return createdAt;
	}
}
