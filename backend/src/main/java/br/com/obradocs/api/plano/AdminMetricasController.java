package br.com.obradocs.api.plano;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
class AdminMetricasController {

    private final JdbcTemplate jdbc;
    private final AdminAuthorizationService adminAuthorization;

    @GetMapping("/metricas")
    MetricasResponse consultar(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fim) {
        adminAuthorization.exigirAdministrador(jwt);
        if (fim.isBefore(inicio)) {
            throw new IllegalArgumentException("A data final deve ser igual ou posterior a data inicial");
        }

        Timestamp inicioUtc = Timestamp.from(inicio.atStartOfDay(ZoneOffset.UTC).toInstant());
        Timestamp fimExclusivoUtc = Timestamp.from(fim.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant());
        Totais totais = jdbc.queryForObject("""
                with periodo as (
                    select ?::timestamptz as inicio, ?::timestamptz as fim
                )
                select
                    (select count(*) from obra_convites, periodo
                        where created_at >= periodo.inicio and created_at < periodo.fim) as convites_enviados,
                    (select count(*) from obra_convites, periodo
                        where accepted_at >= periodo.inicio and accepted_at < periodo.fim) as convites_aceitos,
                    (select count(*) from arquivos, periodo
                        where revisao > 1 and created_at >= periodo.inicio and created_at < periodo.fim)
                        as revisoes_enviadas,
                    (select count(*) from arquivos, periodo
                        where aprovacao_solicitada_at >= periodo.inicio
                          and aprovacao_solicitada_at < periodo.fim) as aprovacoes_solicitadas,
                    (select count(*) from arquivos, periodo
                        where aprovacao_decidida_at >= periodo.inicio
                          and aprovacao_decidida_at < periodo.fim) as aprovacoes_concluidas,
                    (select avg(extract(epoch from (aprovacao_decidida_at - aprovacao_solicitada_at)) / 3600.0)
                        from arquivos, periodo
                        where aprovacao_decidida_at >= periodo.inicio
                          and aprovacao_decidida_at < periodo.fim) as tempo_medio_aprovacao_horas,
                    (select count(*) from arquivos, periodo
                        where aprovacao_status = 'CHANGES_REQUESTED'
                          and aprovacao_decidida_at >= periodo.inicio
                          and aprovacao_decidida_at < periodo.fim) as alteracoes_solicitadas
                """,
                (rs, rowNum) -> new Totais(
                        rs.getLong("convites_enviados"),
                        rs.getLong("convites_aceitos"),
                        rs.getLong("revisoes_enviadas"),
                        rs.getLong("aprovacoes_solicitadas"),
                        rs.getLong("aprovacoes_concluidas"),
                        rs.getBigDecimal("tempo_medio_aprovacao_horas"),
                        rs.getLong("alteracoes_solicitadas")),
                inicioUtc,
                fimExclusivoUtc);

        List<AtividadeObraResponse> atividadePorObra = jdbc.query("""
                select o.id, o.nome, count(distinct h.user_id) as usuarios_com_atividade_registrada
                from historico h
                join obras o on o.id = h.obra_id
                where h.created_at >= ? and h.created_at < ? and h.user_id is not null
                group by o.id, o.nome
                order by usuarios_com_atividade_registrada desc, o.nome
                """,
                (rs, rowNum) -> new AtividadeObraResponse(
                        rs.getObject("id", UUID.class),
                        rs.getString("nome"),
                        rs.getLong("usuarios_com_atividade_registrada")),
                inicioUtc,
                fimExclusivoUtc);

        return new MetricasResponse(
                inicio,
                fim,
                totais.convitesEnviados(),
                totais.convitesAceitos(),
                taxaAceite(totais),
                totais.revisoesEnviadas(),
                totais.aprovacoesSolicitadas(),
                totais.aprovacoesConcluidas(),
                arredondar(totais.tempoMedioAprovacaoHoras()),
                totais.alteracoesSolicitadas(),
                atividadePorObra);
    }

    private BigDecimal taxaAceite(Totais totais) {
        if (totais.convitesEnviados() == 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(totais.convitesAceitos())
                .divide(BigDecimal.valueOf(totais.convitesEnviados()), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal arredondar(BigDecimal valor) {
        return valor == null ? null : valor.setScale(2, RoundingMode.HALF_UP);
    }

    record MetricasResponse(
            LocalDate inicio,
            LocalDate fim,
            long convitesEnviados,
            long convitesAceitos,
            BigDecimal taxaAceite,
            long revisoesEnviadas,
            long aprovacoesSolicitadas,
            long aprovacoesConcluidas,
            BigDecimal tempoMedioAprovacaoHoras,
            long alteracoesSolicitadas,
            List<AtividadeObraResponse> atividadePorObra) {
    }

    record AtividadeObraResponse(
            UUID obraId,
            String obraNome,
            long usuariosComAtividadeRegistrada) {
    }

    private record Totais(
            long convitesEnviados,
            long convitesAceitos,
            long revisoesEnviadas,
            long aprovacoesSolicitadas,
            long aprovacoesConcluidas,
            BigDecimal tempoMedioAprovacaoHoras,
            long alteracoesSolicitadas) {
    }
}
