import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowUpRight, BriefcaseBusiness, HardDrive, UsersRound } from "lucide-react-native";
import AppButton from "@components/AppButton";
import ScreenState from "@components/ScreenState";
import { consultarMinhaAssinatura, MinhaAssinatura } from "@services/planoService";
import { toastInfo } from "@utils/toast";
import { colors, layout, radius, spacing, typography } from "@theme/index";

const formatBytes = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) {
    return `${mb.toLocaleString("pt-BR", { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
  }
  return `${(mb / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`;
};

const formatLimit = (value: number | null) => (value == null ? "Ilimitado" : String(value));

const MeuPlanoScreen = () => {
  const [assinatura, setAssinatura] = useState<MinhaAssinatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setAssinatura(await consultarMinhaAssinatura());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <ScreenState loading title="Carregando seu plano" />;
  }

  if (error || !assinatura) {
    return (
      <ScreenState
        title="Não foi possível carregar seu plano"
        description="Verifique sua conexão e tente novamente."
        actionLabel="Tentar novamente"
        onAction={() => void load()}
      />
    );
  }

  const { plano, uso } = assinatura;
  const gratuito = plano.codigo === "FREE";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.planCard}>
        <Text style={styles.eyebrow}>Plano atual</Text>
        <View style={styles.planRow}>
          <View style={[styles.statusDot, gratuito ? styles.freeDot : styles.proDot]} />
          <Text style={styles.planName}>{plano.nome}</Text>
        </View>
        {plano.fundador && <Text style={styles.founder}>Condição especial de fundador</Text>}
      </View>

      <Text style={styles.sectionTitle}>Uso e limites</Text>
      <View style={styles.usageGroup}>
        <UsageRow
          icon={<BriefcaseBusiness size={21} color={colors.primary} />}
          label="Obras"
          value={`${uso.obras} / ${formatLimit(uso.limiteObras)}`}
        />
        <UsageRow
          icon={<HardDrive size={21} color={colors.primary} />}
          label="Armazenamento"
          value={`${formatBytes(uso.armazenamentoBytes)} / ${formatBytes(uso.limiteArmazenamentoBytes)}`}
        />
        <UsageRow
          icon={<UsersRound size={21} color={colors.primary} />}
          label="Colaboradores"
          value={uso.limiteColaboradoresPorObra == null ? "Ilimitados" : `${uso.limiteColaboradoresPorObra} por obra`}
          last
        />
      </View>

      {gratuito && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Conhecer o Plano Profissional</Text>
          <Text style={styles.upgradeDescription}>
            Tenha obras ilimitadas, 5 GB de armazenamento e colaboradores ilimitados.
          </Text>
          <AppButton
            label="Conhecer o Profissional"
            icon={<ArrowUpRight size={19} color={colors.surface} />}
            onPress={() => toastInfo("Plano Profissional", "Em breve você poderá solicitar o upgrade pelo aplicativo.")}
            style={styles.upgradeButton}
          />
        </View>
      )}
    </ScrollView>
  );
};

const UsageRow = ({ icon, label, value, last = false }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) => (
  <View style={[styles.usageRow, !last && styles.usageBorder]}>
    <View style={styles.usageIcon}>{icon}</View>
    <Text style={styles.usageLabel}>{label}</Text>
    <Text style={styles.usageValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  eyebrow: { color: colors.textMuted, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  planRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.sm },
  freeDot: { backgroundColor: "#22C55E" },
  proDot: { backgroundColor: colors.primary },
  planName: { color: colors.text, fontSize: 24, fontWeight: "800" },
  founder: { color: colors.primary, marginTop: spacing.sm, fontWeight: "600" },
  sectionTitle: { ...typography.sectionTitle, marginBottom: spacing.md },
  usageGroup: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  usageRow: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  usageBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  usageIcon: { width: 38 },
  usageLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" },
  usageValue: { color: colors.textMuted, fontSize: 14, fontWeight: "700", textAlign: "right" },
  upgradeCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  upgradeTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  upgradeDescription: { color: colors.textMuted, lineHeight: 21, marginTop: spacing.sm },
  upgradeButton: { marginTop: spacing.lg },
});

export default MeuPlanoScreen;
