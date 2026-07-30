package br.com.obradocs.api.obra;

import java.time.Instant;
import java.util.UUID;

import br.com.obradocs.api.categoria.ObraTemplate;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "obras")
@Getter(AccessLevel.PACKAGE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Obra {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, length = 200)
	private String nome;

	@Column(name = "codigo_compartilhamento", nullable = false, unique = true, length = 9)
	private String codigoCompartilhamento;

	@Column(name = "created_by", updatable = false)
	private UUID createdBy;

	@Column(name = "deleted_at")
	private Instant deletedAt;

	@Column(name = "deleted_by")
	private UUID deletedBy;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
	@Column(name = "template_codigo", nullable = false, updatable = false, length = 30)
	private ObraTemplate templateCodigo;

	Obra(String nome, String codigoCompartilhamento, UUID createdBy, ObraTemplate templateCodigo) {
		this.nome = nome;
		this.codigoCompartilhamento = codigoCompartilhamento;
		this.createdBy = createdBy;
		this.templateCodigo = templateCodigo;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
	}

	void renomear(String nome) {
		this.nome = nome;
	}

	void excluir(UUID usuarioId) {
		deletedAt = Instant.now();
		deletedBy = usuarioId;
	}
}
