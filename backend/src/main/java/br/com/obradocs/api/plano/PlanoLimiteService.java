package br.com.obradocs.api.plano;

import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlanoLimiteService {

    private final PlanoService planos;
    private final EntityManager entityManager;

    @Transactional
    public void validarCriacaoObra(UUID usuarioId) {
        bloquearUsuario(usuarioId);
        PlanoService.LimitesPlano limites = planos.limites(usuarioId);
        Integer limite = limites.limiteObras();
        if (limite == null) {
            return;
        }

        long usadas = numero("""
                select count(*)
                from obras
                where created_by = :usuarioId
                  and deleted_at is null
                """, "usuarioId", usuarioId);

        if (usadas >= limite) {
            throw new LimitePlanoException(
                    "PLAN_LIMIT_REACHED",
                    "Você atingiu o limite de obras do seu plano.",
                    HttpStatus.CONFLICT,
                    Map.of("used", usadas, "limit", limite));
        }
    }

    @Transactional
    public UUID reservarUpload(UUID obraId, long tamanhoSolicitado) {
        UUID proprietarioId = proprietarioDaObra(obraId);
        bloquearUsuario(proprietarioId);
        PlanoService.LimitesPlano limites = planos.limites(proprietarioId);
        long limite = limites.limiteArmazenamentoBytes();
        long usado = numero("""
                select coalesce(sum(a.tamanho_bytes), 0)
                from arquivos a
                join obras o on o.id = a.obra_id
                where o.created_by = :usuarioId
                  and o.deleted_at is null
                """, "usuarioId", proprietarioId);
        entityManager.createNativeQuery("""
                delete from storage_upload_reservations
                where expires_at <= now()
                """).executeUpdate();
        long reservado = numero("""
                select coalesce(sum(tamanho_bytes), 0)
                from storage_upload_reservations
                where proprietario_id = :usuarioId
                  and expires_at > now()
                """, "usuarioId", proprietarioId);

        if (usado + reservado + tamanhoSolicitado > limite) {
            throw new LimitePlanoException(
                    "STORAGE_LIMIT_REACHED",
                    "O upload ultrapassa o limite de armazenamento do plano.",
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    Map.of(
                            "usedBytes", usado + reservado,
                            "limitBytes", limite,
                            "requestedBytes", tamanhoSolicitado));
        }
        UUID reservaId = UUID.randomUUID();
        entityManager.createNativeQuery("""
                insert into storage_upload_reservations (
                    id, proprietario_id, obra_id, tamanho_bytes, expires_at
                ) values (:id, :proprietarioId, :obraId, :tamanho, :expiresAt)
                """)
                .setParameter("id", reservaId)
                .setParameter("proprietarioId", proprietarioId)
                .setParameter("obraId", obraId)
                .setParameter("tamanho", tamanhoSolicitado)
                .setParameter("expiresAt", Instant.now().plus(15, ChronoUnit.MINUTES))
                .executeUpdate();
        return reservaId;
    }

    @Transactional
    public void liberarReserva(UUID reservaId) {
        entityManager.createNativeQuery(
                "delete from storage_upload_reservations where id = :id")
                .setParameter("id", reservaId)
                .executeUpdate();
    }

    @Transactional
    public void validarNovoColaborador(UUID obraId, UUID convidadoId) {
        UUID proprietarioId = proprietarioDaObra(obraId);
        bloquearUsuario(proprietarioId);
        if (possuiPermissao(obraId, convidadoId)) {
            return;
        }

        PlanoService.LimitesPlano limites = planos.limites(proprietarioId);
        Integer limite = limites.limiteColaboradoresPorObra();
        if (limite == null) {
            return;
        }

        long usados = numero("""
                select count(*)
                from permissoes
                where obra_id = :obraId
                  and user_id <> :proprietarioId
                """, Map.of("obraId", obraId, "proprietarioId", proprietarioId));

        if (usados >= limite) {
            throw new LimitePlanoException(
                    "COLLABORATOR_LIMIT_REACHED",
                    "Você atingiu o limite de colaboradores desta obra.",
                    HttpStatus.CONFLICT,
                    Map.of("used", usados, "limit", limite, "obraId", obraId));
        }
    }

    @Transactional(readOnly = true)
    public void validarEntradaPorCodigo(String codigo, UUID usuarioId) {
        String normalizado = codigo == null ? "" : codigo.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        Object value = entityManager.createNativeQuery("""
                select id
                from obras
                where upper(replace(codigo_compartilhamento, '-', '')) = :codigo
                  and deleted_at is null
                """)
                .setParameter("codigo", normalizado)
                .getSingleResult();
        UUID obraId = value instanceof UUID uuid ? uuid : UUID.fromString(value.toString());
        validarNovoColaborador(obraId, usuarioId);
    }

    @Transactional(readOnly = true)
    public UUID buscarUsuarioIdPorEmail(String email) {
        Object value = entityManager.createNativeQuery("""
                select id
                from usuarios
                where lower(email) = lower(:email)
                """)
                .setParameter("email", email.trim())
                .getSingleResult();
        return value instanceof UUID uuid ? uuid : UUID.fromString(value.toString());
    }

    private UUID proprietarioDaObra(UUID obraId) {
        Object value = entityManager.createNativeQuery("""
                select created_by
                from obras
                where id = :obraId
                  and deleted_at is null
                """)
                .setParameter("obraId", obraId)
                .getSingleResult();
        return value instanceof UUID uuid ? uuid : UUID.fromString(value.toString());
    }

    private boolean possuiPermissao(UUID obraId, UUID usuarioId) {
        return numero("""
                select count(*)
                from permissoes
                where obra_id = :obraId
                  and user_id = :usuarioId
                """, Map.of("obraId", obraId, "usuarioId", usuarioId)) > 0;
    }

    private void bloquearUsuario(UUID usuarioId) {
        entityManager.createNativeQuery("select id from usuarios where id = :id for update")
                .setParameter("id", usuarioId)
                .getSingleResult();
    }

    private long numero(String sql, String parameterName, Object value) {
        return ((Number) entityManager.createNativeQuery(sql)
                .setParameter(parameterName, value)
                .getSingleResult()).longValue();
    }

    private long numero(String sql, Map<String, Object> parameters) {
        var query = entityManager.createNativeQuery(sql);
        parameters.forEach(query::setParameter);
        return ((Number) query.getSingleResult()).longValue();
    }
}
