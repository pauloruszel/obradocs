import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Building2, Mail, Phone, UsersRound } from "lucide-react-native";
import ScreenState from "@components/ScreenState";
import AppButton from "@components/AppButton";
import {
  AdminUpgradeInterest,
  atualizarStatusInteresse,
  listarInteressesUpgrade,
} from "@services/upgradeInterestService";
import { toastError, toastSuccess } from "@utils/toast";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type LeadStatus = AdminUpgradeInterest["status"];
type Filter = "ALL" | LeadStatus;

const statusLabel: Record<LeadStatus, string> = {
  PENDING: "Novo interesse",
  CONTACTED: "Contatado",
  CONVERTED: "Convertido",
  CANCELLED: "Cancelado",
};

const filters: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Novos" },
  { value: "CONTACTED", label: "Contatados" },
  { value: "CONVERTED", label: "Convertidos" },
  { value: "CANCELLED", label: "Cancelados" },
];

const UpgradeInteressesScreen = () => {
  const [items, setItems] = useState<AdminUpgradeInterest[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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
  const visibleItems = useMemo(
    () => filter === "ALL" ? items : items.filter((item) => item.status === filter),
    [filter, items],
  );

  const updateStatus = async (
    item: AdminUpgradeInterest,
    status: "CONTACTED" | "CONVERTED" | "CANCELLED",
  ) => {
    setUpdatingId(item.id);
    try {
      await atualizarStatusInteresse(item.id, status);
      setItems((current) =>
        current.map((lead) => lead.id === item.id ? { ...lead, status } : lead));
      toastSuccess(status === "CONVERTED" ? "Plano Profissional ativado" : "Status atualizado");
    } catch (requestError) {
      toastError("Não foi possível atualizar", (requestError as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmConversion = (item: AdminUpgradeInterest) =>
    Alert.alert(
      "Ativar Plano Profissional?",
      `Confirme somente após validar a contratação de ${item.nome}. A ação ficará registrada.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Ativar plano", onPress: () => updateStatus(item, "CONVERTED") },
      ],
    );

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
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true).catch(() => undefined)} />
      )}
    >
      <View style={styles.summary}>
        <View style={styles.summaryIcon}><UsersRound size={24} color={colors.primary} /></View>
        <View>
          <Text style={styles.summaryLabel}>Leads do Plano Profissional</Text>
          <Text style={styles.summaryValue}>{items.length} interessados · {pending} novos</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map(({ value, label }) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            style={[styles.filter, filter === value && styles.filterActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === value }}
          >
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Interessados</Text>
      {visibleItems.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Nenhum interessado neste filtro.</Text></View>
      ) : visibleItems.map((item) => (
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
          <Pressable
            style={styles.infoRow}
            onPress={() => Linking.openURL(`mailto:${item.email}`)}
            accessibilityRole="link"
          >
            <Mail size={16} color={colors.primary} /><Text style={styles.link}>{item.email}</Text>
          </Pressable>
          {item.telefone ? (
            <Pressable
              style={styles.infoRow}
              onPress={() => Linking.openURL(`tel:${item.telefone}`)}
              accessibilityRole="link"
            >
              <Phone size={16} color={colors.primary} /><Text style={styles.link}>{item.telefone}</Text>
            </Pressable>
          ) : null}
          {item.empresa ? (
            <View style={styles.infoRow}>
              <Building2 size={16} color={colors.textMuted} /><Text style={styles.info}>{item.empresa}</Text>
            </View>
          ) : null}
          {!["CONVERTED", "CANCELLED"].includes(item.status) && (
            <View style={styles.actions}>
              {item.status === "PENDING" && (
                <AppButton
                  label="Marcar contato"
                  variant="secondary"
                  onPress={() => updateStatus(item, "CONTACTED")}
                  loading={updatingId === item.id}
                  style={styles.action}
                />
              )}
              <AppButton
                label="Ativar PRO"
                onPress={() => confirmConversion(item)}
                disabled={updatingId === item.id}
                style={styles.action}
              />
              <AppButton
                label="Cancelar lead"
                variant="ghost"
                onPress={() => updateStatus(item, "CANCELLED")}
                disabled={updatingId === item.id}
                style={styles.fullAction}
              />
            </View>
          )}
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
  filters: { gap: spacing.sm, paddingVertical: spacing.lg },
  filter: { minHeight: 42, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  sectionTitle: { ...typography.sectionTitle, marginBottom: spacing.md },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.textMuted, textAlign: "center" },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.md },
  cardTitleWrap: { flex: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: "800" },
  date: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  status: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  statusPending: { backgroundColor: colors.primarySoft },
  statusText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  infoRow: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  info: { color: colors.textMuted, flex: 1 },
  link: { color: colors.primary, flex: 1, textDecorationLine: "underline" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
  fullAction: { width: "100%" },
});

export default UpgradeInteressesScreen;
