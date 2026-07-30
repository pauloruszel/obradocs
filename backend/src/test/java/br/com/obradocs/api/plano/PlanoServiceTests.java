package br.com.obradocs.api.plano;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import jakarta.persistence.EntityManager;

class PlanoServiceTests {

    private static final List<AssinaturaStatus> VIGENTES =
            List.of(AssinaturaStatus.ACTIVE, AssinaturaStatus.TRIALING);

    private final PlanoRepository planos = mock(PlanoRepository.class);
    private final AssinaturaRepository assinaturas = mock(AssinaturaRepository.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final PlanoService service = new PlanoService(planos, assinaturas, entityManager);

    @Test
    void atribuiPlanoGratuitoQuandoUsuarioAindaNaoPossuiAssinatura() {
        UUID usuarioId = UUID.randomUUID();
        Plano gratuito = mock(Plano.class);
        UUID planoId = UUID.randomUUID();

        when(assinaturas.existsByUsuarioIdAndStatusIn(usuarioId, VIGENTES)).thenReturn(false);
        when(planos.findByCodigoAndAtivoTrue(PlanoCodigo.FREE)).thenReturn(Optional.of(gratuito));
        when(gratuito.getId()).thenReturn(planoId);
        when(gratuito.getPrecoCentavos()).thenReturn(0);

        service.atribuirPlanoGratuitoSeNecessario(usuarioId);

        ArgumentCaptor<Assinatura> captor = ArgumentCaptor.forClass(Assinatura.class);
        verify(assinaturas).save(captor.capture());
        Assinatura criada = captor.getValue();
        org.assertj.core.api.Assertions.assertThat(criada.getUsuarioId()).isEqualTo(usuarioId);
        org.assertj.core.api.Assertions.assertThat(criada.getPlanoId()).isEqualTo(planoId);
        org.assertj.core.api.Assertions.assertThat(criada.getStatus()).isEqualTo(AssinaturaStatus.ACTIVE);
        org.assertj.core.api.Assertions.assertThat(criada.getPrecoCentavosContratado()).isZero();
    }

    @Test
    void naoDuplicaAssinaturaVigente() {
        UUID usuarioId = UUID.randomUUID();
        when(assinaturas.existsByUsuarioIdAndStatusIn(usuarioId, VIGENTES)).thenReturn(true);

        service.atribuirPlanoGratuitoSeNecessario(usuarioId);

        verify(planos, never()).findByCodigoAndAtivoTrue(PlanoCodigo.FREE);
        verify(assinaturas, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void falhaDeFormaClaraQuandoPlanoGratuitoNaoEstaConfigurado() {
        UUID usuarioId = UUID.randomUUID();
        when(assinaturas.existsByUsuarioIdAndStatusIn(usuarioId, VIGENTES)).thenReturn(false);
        when(planos.findByCodigoAndAtivoTrue(PlanoCodigo.FREE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atribuirPlanoGratuitoSeNecessario(usuarioId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Plano Gratuito não configurado");
    }
}
