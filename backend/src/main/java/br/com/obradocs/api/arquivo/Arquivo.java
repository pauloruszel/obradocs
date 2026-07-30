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
@Table(name = "arquivos")
@Getter(AccessLevel.PACKAGE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Arquivo {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "obra_id", nullable = false, updatable = false)
	private UUID obraId;

	@Column(name = "documento_id", nullable = false, updatable = false)
	private UUID documentoId;

	@Column(nullable = false, updatable = false)
	private int revisao;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, updatable = false, length = 30)
	private ArquivoTipo tipo;

	@Column(name = "nome_original", nullable = false, length = 255)
	private String nomeOriginal;

	@Column(name = "storage_path", nullable = false, unique = true, updatable = false, length = 700)
	private String storagePath;

	@Column(name = "content_type", nullable = false, updatable = false, length = 100)
	private String contentType;

	@Column(name = "tamanho_bytes", nullable = false, updatable = false)
	private long tamanhoBytes;

	@Column(name = "enviado_por", updatable = false)
	private UUID enviadoPor;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	Arquivo(
			UUID obraId,
			UUID documentoId,
			int revisao,
			ArquivoTipo tipo,
			String nomeOriginal,
			String storagePath,
			String contentType,
			long tamanhoBytes,
			UUID enviadoPor) {
		this.obraId = obraId;
		this.documentoId = documentoId;
		this.revisao = revisao;
		this.tipo = tipo;
		this.nomeOriginal = nomeOriginal;
		this.storagePath = storagePath;
		this.contentType = contentType;
		this.tamanhoBytes = tamanhoBytes;
		this.enviadoPor = enviadoPor;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
	}

}
