package br.com.obradocs.api.plano;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface AssinaturaRepository extends JpaRepository<Assinatura, UUID> {
    Optional<Assinatura> findFirstByUsuarioIdAndStatusInOrderByInicioEmDesc(
            UUID usuarioId,
            Iterable<AssinaturaStatus> statuses);

    boolean existsByUsuarioIdAndStatusIn(UUID usuarioId, Iterable<AssinaturaStatus> statuses);
}
