package br.com.obradocs.api.plano;

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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "assinaturas")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Assinatura {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private UUID usuarioId;

    @Column(name = "plano_id", nullable = false)
    private UUID planoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssinaturaStatus status;

    @Column(name = "preco_centavos_contratado", nullable = false)
    private int precoCentavosContratado;

    @Column(nullable = false)
    private boolean fundador;

    @Column(name = "inicio_em", nullable = false)
    private Instant inicioEm;

    @Column(name = "fim_em")
    private Instant fimEm;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    Assinatura(UUID usuarioId, Plano plano) {
        this.usuarioId = usuarioId;
        this.planoId = plano.getId();
        this.status = AssinaturaStatus.ACTIVE;
        this.precoCentavosContratado = plano.getPrecoCentavos();
        this.inicioEm = Instant.now();
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (inicioEm == null) {
            inicioEm = now;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
