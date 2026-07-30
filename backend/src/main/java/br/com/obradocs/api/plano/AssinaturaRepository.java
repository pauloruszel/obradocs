package br.com.obradocs.api.plano;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface AssinaturaRepository extends JpaRepository<Assinatura, UUID> {
    Optional<Assinatura> findFirstByUsuarioIdAndStatusInOrderByInicioEmDesc(
            UUID usuarioId,
            Collection<AssinaturaStatus> statuses);

    boolean existsByUsuarioIdAndStatusIn(UUID usuarioId, Collection<AssinaturaStatus> statuses);
}
