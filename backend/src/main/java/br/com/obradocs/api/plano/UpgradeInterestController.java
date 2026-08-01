package br.com.obradocs.api.plano;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/v1/upgrade-interest")
@RequiredArgsConstructor
class UpgradeInterestController {

    private final JdbcTemplate jdbc;
    private final AdminAuthorizationService adminAuthorization;

    @PostMapping
    @Transactional
    UpgradeInterestResponse registrar(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpgradeInterestRequest request) {
        UUID usuarioId = UUID.fromString(jwt.getSubject());
        UsuarioResumo usuario = buscarUsuario(usuarioId);
        String telefone = normalizarOpcional(request.telefone());
        String empresa = normalizarOpcional(request.empresa());

        return jdbc.queryForObject("""
                insert into upgrade_interest (usuario_id, nome, email, telefone, empresa, status, updated_at)
                values (?, ?, ?, ?, ?, 'PENDING', now())
                on conflict (usuario_id) do update
                    set nome = excluded.nome,
                        email = excluded.email,
                        telefone = excluded.telefone,
                        empresa = excluded.empresa,
                        status = case
                            when upgrade_interest.status = 'CONVERTED' then upgrade_interest.status
                            else 'PENDING'
                        end,
                        updated_at = now()
                returning id, nome, email, telefone, empresa, status, created_at, updated_at
                """,
                (rs, rowNum) -> new UpgradeInterestResponse(
                        rs.getObject("id", UUID.class),
                        rs.getString("nome"),
                        rs.getString("email"),
                        rs.getString("telefone"),
                        rs.getString("empresa"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant()),
                usuarioId,
                usuario.nome(),
                usuario.email(),
                telefone,
                empresa);
    }

    @GetMapping("/me")
    UpgradeInterestResponse consultarMeuInteresse(@AuthenticationPrincipal Jwt jwt) {
        UUID usuarioId = UUID.fromString(jwt.getSubject());
        List<UpgradeInterestResponse> resultados = jdbc.query("""
                select id, nome, email, telefone, empresa, status, created_at, updated_at
                from upgrade_interest
                where usuario_id = ?
                """,
                (rs, rowNum) -> new UpgradeInterestResponse(
                        rs.getObject("id", UUID.class),
                        rs.getString("nome"),
                        rs.getString("email"),
                        rs.getString("telefone"),
                        rs.getString("empresa"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant()),
                usuarioId);
        return resultados.stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interesse não registrado"));
    }

    @GetMapping("/admin")
    List<AdminUpgradeInterestResponse> listar(@AuthenticationPrincipal Jwt jwt) {
        adminAuthorization.exigirAdministrador(jwt);

        return jdbc.query("""
                select id, usuario_id, nome, email, telefone, empresa, status, origem, created_at, updated_at
                from upgrade_interest
                order by
                    case status
                        when 'PENDING' then 1
                        when 'CONTACTED' then 2
                        when 'CONVERTED' then 3
                        else 4
                    end,
                    created_at desc
                """,
                (rs, rowNum) -> new AdminUpgradeInterestResponse(
                        rs.getObject("id", UUID.class),
                        rs.getObject("usuario_id", UUID.class),
                        rs.getString("nome"),
                        rs.getString("email"),
                        rs.getString("telefone"),
                        rs.getString("empresa"),
                        rs.getString("status"),
                        rs.getString("origem"),
                        rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant()));
    }

    @GetMapping("/admin-capability")
    AdminCapabilityResponse capacidadeAdministrativa(@AuthenticationPrincipal Jwt jwt) {
        return new AdminCapabilityResponse(adminAuthorization.isAdministrador(jwt));
    }

    @PatchMapping("/admin/{id}/status")
    @Transactional
    void atualizarStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @Valid @RequestBody AdminStatusRequest request) {
        adminAuthorization.exigirAdministrador(jwt);
        UUID adminId = UUID.fromString(jwt.getSubject());
        LeadStatus atual = jdbc.query("""
                select usuario_id, status
                from upgrade_interest
                where id = ?
                for update
                """,
                (rs, rowNum) -> new LeadStatus(
                        rs.getObject("usuario_id", UUID.class),
                        rs.getString("status")),
                id).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interesse não encontrado"));

        if ("CONVERTED".equals(atual.status()) && !"CONVERTED".equals(request.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Um interesse convertido não pode ser reaberto");
        }
        if (atual.status().equals(request.status())) {
            return;
        }

        String action = "LEAD_STATUS_CHANGED";
        if ("CONVERTED".equals(request.status())) {
            ativarPlanoProfissional(atual.usuarioId());
            action = "PRO_ACTIVATED";
        }
        jdbc.update(
                "update upgrade_interest set status = ?, updated_at = now() where id = ?",
                request.status(),
                id);
        jdbc.update("""
                insert into admin_plan_audit (
                    admin_id, usuario_id, upgrade_interest_id, action, previous_status, new_status
                ) values (?, ?, ?, ?, ?, ?)
                """,
                adminId,
                atual.usuarioId(),
                id,
                action,
                atual.status(),
                request.status());
    }

    private void ativarPlanoProfissional(UUID usuarioId) {
        int updated = jdbc.update("""
                update assinaturas
                set plano_id = '10000000-0000-0000-0000-000000000002',
                    status = 'ACTIVE',
                    preco_centavos_contratado = 2490,
                    inicio_em = now(),
                    fim_em = null,
                    updated_at = now()
                where usuario_id = ? and status in ('ACTIVE', 'TRIALING')
                """, usuarioId);
        if (updated == 0) {
            jdbc.update("""
                    insert into assinaturas (
                        id, usuario_id, plano_id, status, preco_centavos_contratado,
                        fundador, inicio_em
                    ) values (
                        gen_random_uuid(), ?,
                        '10000000-0000-0000-0000-000000000002',
                        'ACTIVE', 2490, false, now()
                    )
                    """, usuarioId);
        }
    }

    private UsuarioResumo buscarUsuario(UUID usuarioId) {
        List<UsuarioResumo> usuarios = jdbc.query(
                "select nome, email from usuarios where id = ? and ativo = true",
                (rs, rowNum) -> new UsuarioResumo(rs.getString("nome"), rs.getString("email")),
                usuarioId);
        return usuarios.stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário inválido"));
    }

    private String normalizarOpcional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    record UpgradeInterestRequest(
            @Size(max = 30) String telefone,
            @Size(max = 150) String empresa) {
    }

    record UpgradeInterestResponse(
            UUID id,
            String nome,
            String email,
            String telefone,
            String empresa,
            String status,
            Instant createdAt,
            Instant updatedAt) {
    }

    record AdminUpgradeInterestResponse(
            UUID id,
            UUID usuarioId,
            String nome,
            String email,
            String telefone,
            String empresa,
            String status,
            String origem,
            Instant createdAt,
            Instant updatedAt) {
    }

    record AdminCapabilityResponse(boolean admin) {
    }

    record AdminStatusRequest(
            @jakarta.validation.constraints.NotNull
            @jakarta.validation.constraints.Pattern(
                    regexp = "CONTACTED|CONVERTED|CANCELLED",
                    message = "Status inválido")
            String status) {
    }

    private record UsuarioResumo(String nome, String email) {
    }

    private record LeadStatus(UUID usuarioId, String status) {
    }
}
