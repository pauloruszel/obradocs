package br.com.obradocs.api.categoria;

import java.time.Instant;
import java.util.UUID;

import br.com.obradocs.api.arquivo.ArquivoTipo;
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
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "categorias_obra")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class CategoriaObra {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "obra_id", nullable = false, updatable = false)
    private UUID obraId;

    @Column(nullable = false, length = 80)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ArquivoTipo tipo;

    @Column(nullable = false)
    private int ordem;

    @Column(nullable = false)
    private boolean padrao;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    CategoriaObra(UUID obraId, String nome, ArquivoTipo tipo, int ordem, boolean padrao) {
        this.obraId = obraId;
        this.nome = nome;
        this.tipo = tipo;
        this.ordem = ordem;
        this.padrao = padrao;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    void atualizar(String nome, Integer ordem) {
        if (nome != null) {
            this.nome = nome;
        }
        if (ordem != null) {
            this.ordem = ordem;
        }
    }
}
