package br.com.obradocs.api.obra;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
		name = "notificacoes",
		uniqueConstraints = @UniqueConstraint(
				name = "uk_notificacoes_usuario_historico",
				columnNames = {"usuario_id", "historico_id"}))
@Getter(AccessLevel.PACKAGE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Notificacao {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "usuario_id", nullable = false, updatable = false)
	private UUID usuarioId;

	@Column(name = "historico_id", nullable = false, updatable = false)
	private UUID historicoId;

	@Column(name = "lida_at")
	private Instant lidaAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	Notificacao(UUID usuarioId, UUID historicoId) {
		this.usuarioId = usuarioId;
		this.historicoId = historicoId;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
	}
}
