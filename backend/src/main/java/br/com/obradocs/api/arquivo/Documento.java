package br.com.obradocs.api.arquivo;

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
@Table(name = "documentos")
@Getter(AccessLevel.PACKAGE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Documento {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "obra_id", nullable = false, updatable = false)
	private UUID obraId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, updatable = false, length = 30)
	private ArquivoTipo tipo;

	@Column(nullable = false, length = 255)
	private String nome;

	@Column(name = "revisao_atual", nullable = false)
	private int revisaoAtual = 1;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	Documento(UUID obraId, ArquivoTipo tipo, String nome) {
		this.obraId = obraId;
		this.tipo = tipo;
		this.nome = nome;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
	}

	int adicionarRevisao() {
		return ++revisaoAtual;
	}

	void renomear(String nome) {
		this.nome = nome;
	}
}
