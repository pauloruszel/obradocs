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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "obra_convites")
@Getter(AccessLevel.PACKAGE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ObraConvite {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "obra_id", nullable = false, updatable = false)
	private UUID obraId;

	@Column(nullable = false, length = 320)
	private String email;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Papel papel;

	@Column(name = "token_hash", nullable = false, unique = true, updatable = false, length = 64)
	private String tokenHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Status status = Status.PENDING;

	@Column(name = "expires_at", nullable = false, updatable = false)
	private Instant expiresAt;

	@Column(name = "invited_by", nullable = false, updatable = false)
	private UUID invitedBy;

	@Column(name = "accepted_by")
	private UUID acceptedBy;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "accepted_at")
	private Instant acceptedAt;

	ObraConvite(
			UUID obraId,
			String email,
			Papel papel,
			String tokenHash,
			Instant expiresAt,
			UUID invitedBy) {
		this.obraId = obraId;
		this.email = email;
		this.papel = papel;
		this.tokenHash = tokenHash;
		this.expiresAt = expiresAt;
		this.invitedBy = invitedBy;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
	}

	boolean expirar(Instant now) {
		if (status == Status.PENDING && !expiresAt.isAfter(now)) {
			status = Status.EXPIRED;
			return true;
		}
		return false;
	}

	void aceitar(UUID usuarioId, Instant now) {
		status = Status.ACCEPTED;
		acceptedBy = usuarioId;
		acceptedAt = now;
	}

	void revogar() {
		status = Status.REVOKED;
	}

	enum Status {
		PENDING,
		ACCEPTED,
		EXPIRED,
		REVOKED
	}
}
