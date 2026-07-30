import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Building2, Mail, Phone, UsersRound } from "lucide-react-native";
import ScreenState from "@components/ScreenState";
import { AdminUpgradeInterest, listarInteressesUpgrade } from "@services/upgradeInterestService";
import { colors, layout, radius, spacing, typography } from "@theme/index";

const statusLabel: Record<AdminUpgradeInterest["status"], string> = {
  PENDING: "Novo interesse",
  CONTACTED: "Contatado",
  CONVERTED: "Convertido",
  CANCELLED: "Cancelado",
};

const UpgradeInteressesScreen = () => {
  const [items, setItems] = useState<AdminUpgradeInterest[]>([]);
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
      setItems(await listarInteressesUpgrade());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const pending = useMemo(() => items.filter((item) => item.status === "PENDING").length, [items]);

  if (loading) return <ScreenState loading title="Carregando interessados" />;
  if (error) {
    return (
      <ScreenState
        title="Não foi possível carregar os interessados"
        actionLabel="Tentar novamente"
        onAction={() => load().catch(() => undefined)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true).catch(() => undefined)}
        />
      )}
    >
      <View style={styles.summary}>
        <View style={styles.summaryIcon}><UsersRound size={24} color={colors.primary} /></View>
        <View>
          <Text style={styles.summaryLabel}>Leads do Plano Profissional</Text>
          <Text style={styles.summaryValue}>{items.length} interessados · {pending} novos</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Interessados</Text>
      {items.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Nenhum interesse registrado até o momento.</Text></View>
      ) : items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.name}>{item.nome}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString("pt-BR")}</Text>
            </View>
            <View style={[styles.status, item.status === "PENDING" && styles.statusPending]}>
              <Text style={styles.statusText}>{statusLabel[item.status]}</Text>
            </View>
          </View>
          <View style={styles.infoRow}><Mail size={16} color={colors.textMuted} /><Text style={styles.info}>{item.email}</Text></View>
          {item.telefone ? <View style={styles.infoRow}><Phone size={16} color={colors.textMuted} /><Text style={styles.info}>{item.telefone}</Text></View> : null}
          {item.empresa ? <View style={styles.infoRow}><Building2 size={16} color={colors.textMuted} /><Text style={styles.info}>{item.empresa}</Text></View> : null}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center", padding: spacing.lg, paddingBottom: spacing.xxl },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  summaryLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  summaryValue: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 3 },
  sectionTitle: { ...typography.sectionTitle, marginTop: spacing.xl, marginBottom: spacing.md },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.textMuted, textAlign: "center" },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.md },
  cardTitleWrap: { flex: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: "800" },
  date: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  status: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 999, backgroundColor: colors.surfaceMuted },
  statusPending: { backgroundColor: colors.primarySoft },
  statusText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  info: { color: colors.textMuted, flex: 1 },
});

export default UpgradeInteressesScreen;
