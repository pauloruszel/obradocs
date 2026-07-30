package br.com.obradocs.api.plano;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface PlanoRepository extends JpaRepository<Plano, UUID> {
    Optional<Plano> findByCodigoAndAtivoTrue(PlanoCodigo codigo);
}
