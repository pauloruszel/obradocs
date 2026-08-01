import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  CheckCircle2,
  Clock3,
  FileStack,
  Mail,
  MessageSquareWarning,
  UsersRound,
} from "lucide-react-native";
import ScreenState from "@components/ScreenState";
import { AdminMetricas, consultarMetricasAdministrativas } from "@services/adminMetricasService";
import { colors, layout, radius, spacing, typography } from "@theme/index";

const periodos = [7, 30, 90] as const;

const dataLocal = (data: Date) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const intervalo = (dias: number) => {
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setDate(fim.getDate() - dias + 1);
  return { inicio: dataLocal(inicio), fim: dataLocal(fim) };
};

const percentual = (valor: number) => `${Math.round(valor * 100)}%`;

const duracao = (horas: number | null) => {
  if (horas === null) return "Sem dados";
  if (horas < 24) return `${horas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  return `${(horas / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
};

const AdminMetricasScreen = () => {
  const [dias, setDias] = useState<(typeof periodos)[number]>(30);
  const [metricas, setMetricas] = useState<AdminMetricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(false);
    try {
      const { inicio, fim } = intervalo(dias);
      setMetricas(await consultarMetricasAdministrativas(inicio, fim));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dias]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  if (loading) return <ScreenState loading title="Carregando métricas" />;
  if (error || !metricas) {
    return (
      <ScreenState
        title="Não foi possível carregar as métricas"
        description="Confira sua conexão e tente novamente."
        actionLabel="Tentar novamente"
        onAction={() => load().catch(() => undefined)}
      />
    );
  }

  const indicadores = [
    { label: "Convites enviados", value: metricas.convites_enviados, icon: Mail },
    { label: "Convites aceitos", value: metricas.convites_aceitos, icon: CheckCircle2 },
    { label: "Taxa de aceite", value: percentual(metricas.taxa_aceite), icon: UsersRound },
    { label: "Revisões enviadas", value: metricas.revisoes_enviadas, icon: FileStack },
    { label: "Aprovações solicitadas", value: metricas.aprovacoes_solicitadas, icon: Clock3 },
    { label: "Aprovações concluídas", value: metricas.aprovacoes_concluidas, icon: CheckCircle2 },
    { label: "Tempo para aprovação", value: duracao(metricas.tempo_medio_aprovacao_horas), icon: Clock3 },
    { label: "Alterações solicitadas", value: metricas.alteracoes_solicitadas, icon: MessageSquareWarning },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true).catch(() => undefined)} />}
    >
      <View style={styles.heading}>
        <Text style={styles.title}>Visão geral do produto</Text>
        <Text style={styles.description}>Acompanhe adesão, revisões e aprovações no período.</Text>
      </View>

      <View style={styles.periodRow} accessibilityRole="tablist">
        {periodos.map((periodo) => (
          <Pressable
            key={periodo}
            onPress={() => setDias(periodo)}
            style={[styles.period, dias === periodo && styles.periodActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: dias === periodo }}
          >
            <Text style={[styles.periodText, dias === periodo && styles.periodTextActive]}>{periodo} dias</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.grid}>
        {indicadores.map(({ label, value, icon: Icon }) => (
          <View key={label} style={styles.metricCard}>
            <Icon size={20} color={colors.primary} />
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Atividade registrada por obra</Text>
      <Text style={styles.sectionDescription}>Usuários distintos que geraram ações no histórico.</Text>
      {metricas.atividade_por_obra.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhuma atividade registrada neste período.</Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {metricas.atividade_por_obra.map((obra, index) => (
            <View key={obra.obra_id} style={[styles.activityRow, index > 0 && styles.activityBorder]}>
              <View style={styles.activityInfo}>
                <Text style={styles.activityName} numberOfLines={2}>{obra.obra_nome}</Text>
                <Text style={styles.activityLabel}>com atividade registrada</Text>
              </View>
              <Text style={styles.activityValue}>{obra.usuarios_com_atividade_registrada}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center", padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: { marginBottom: spacing.lg },
  title: { ...typography.screenTitle },
  description: { ...typography.caption, marginTop: spacing.xs },
  periodRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  period: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface },
  periodActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.textMuted, fontWeight: "700" },
  periodTextActive: { color: colors.white },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metricCard: { flexBasis: "45%", minHeight: 128, flexGrow: 1, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  metricValue: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: spacing.md },
  metricLabel: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
  sectionTitle: { ...typography.sectionTitle, marginTop: spacing.xl },
  sectionDescription: { ...typography.caption, marginTop: spacing.xs, marginBottom: spacing.md },
  activityList: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  activityRow: { minHeight: 70, flexDirection: "row", alignItems: "center", paddingVertical: spacing.md },
  activityBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  activityInfo: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  activityName: { color: colors.text, fontWeight: "700" },
  activityLabel: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  activityValue: { minWidth: 40, color: colors.primary, fontSize: 22, fontWeight: "900", textAlign: "right" },
  empty: { padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  emptyText: { color: colors.textMuted, textAlign: "center" },
});

export default AdminMetricasScreen;
