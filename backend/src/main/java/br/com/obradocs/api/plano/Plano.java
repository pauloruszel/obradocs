package br.com.obradocs.api.plano;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "planos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Plano {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 20)
    private PlanoCodigo codigo;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(name = "preco_centavos", nullable = false)
    private int precoCentavos;

    @Column(nullable = false, length = 3)
    private String moeda;

    @Column(name = "limite_obras")
    private Integer limiteObras;

    @Column(name = "limite_armazenamento_bytes", nullable = false)
    private long limiteArmazenamentoBytes;

    @Column(name = "limite_colaboradores_por_obra")
    private Integer limiteColaboradoresPorObra;

    @Column(nullable = false)
    private boolean ativo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
