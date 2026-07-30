package br.com.obradocs.api.plano;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlanoService {

    private static final List<AssinaturaStatus> STATUS_VIGENTES =
            List.of(AssinaturaStatus.ACTIVE, AssinaturaStatus.TRIALING);

    private final PlanoRepository planos;
    private final AssinaturaRepository assinaturas;
    private final EntityManager entityManager;

    @Transactional
    public void atribuirPlanoGratuitoSeNecessario(UUID usuarioId) {
        if (assinaturas.existsByUsuarioIdAndStatusIn(usuarioId, STATUS_VIGENTES)) {
            return;
        }
        Plano gratuito = planos.findByCodigoAndAtivoTrue(PlanoCodigo.FREE)
                .orElseThrow(() -> new IllegalStateException("Plano Gratuito não configurado"));
        assinaturas.save(new Assinatura(usuarioId, gratuito));
    }

    @Transactional(readOnly = true)
    public PlanoUso consultar(UUID usuarioId) {
        Assinatura assinatura = assinaturaVigente(usuarioId);
        Plano plano = planos.findById(assinatura.getPlanoId())
                .filter(Plano::isAtivo)
                .orElseThrow(() -> new IllegalStateException("Plano da assinatura não está ativo"));

        long obras = ((Number) entityManager.createNativeQuery("""
                select count(*)
                from obras
                where created_by = :usuarioId
                  and deleted_at is null
                """)
                .setParameter("usuarioId", usuarioId)
                .getSingleResult()).longValue();

        long armazenamento = ((Number) entityManager.createNativeQuery("""
                select coalesce(sum(a.tamanho_bytes), 0)
                from arquivos a
                join obras o on o.id = a.obra_id
                where o.created_by = :usuarioId
                  and o.deleted_at is null
                """)
                .setParameter("usuarioId", usuarioId)
                .getSingleResult()).longValue();

        return new PlanoUso(
                new PlanoResumo(
                        plano.getCodigo(),
                        plano.getNome(),
                        assinatura.getPrecoCentavosContratado(),
                        plano.getMoeda(),
                        assinatura.isFundador()),
                new UsoResumo(
                        obras,
                        plano.getLimiteObras(),
                        armazenamento,
                        plano.getLimiteArmazenamentoBytes(),
                        plano.getLimiteColaboradoresPorObra()));
    }

    @Transactional(readOnly = true)
    public LimitesPlano limites(UUID usuarioId) {
        Assinatura assinatura = assinaturaVigente(usuarioId);
        Plano plano = planos.findById(assinatura.getPlanoId())
                .filter(Plano::isAtivo)
                .orElseThrow(() -> new IllegalStateException("Plano da assinatura não está ativo"));
        return new LimitesPlano(
                plano.getCodigo(),
                plano.getLimiteObras(),
                plano.getLimiteArmazenamentoBytes(),
                plano.getLimiteColaboradoresPorObra());
    }

    private Assinatura assinaturaVigente(UUID usuarioId) {
        return assinaturas.findFirstByUsuarioIdAndStatusInOrderByInicioEmDesc(usuarioId, STATUS_VIGENTES)
                .orElseThrow(() -> new NoSuchElementException("Assinatura ativa não encontrada"));
    }

    public record PlanoUso(PlanoResumo plano, UsoResumo uso) {
    }

    public record PlanoResumo(
            PlanoCodigo codigo,
            String nome,
            int precoCentavos,
            String moeda,
            boolean fundador) {
    }

    public record UsoResumo(
            long obras,
            Integer limiteObras,
            long armazenamentoBytes,
            long limiteArmazenamentoBytes,
            Integer limiteColaboradoresPorObra) {
    }

    public record LimitesPlano(
            PlanoCodigo codigo,
            Integer limiteObras,
            long limiteArmazenamentoBytes,
            Integer limiteColaboradoresPorObra) {
    }
}
