import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowUpRight, BriefcaseBusiness, HardDrive, UsersRound } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import AppButton from "@components/AppButton";
import ScreenState from "@components/ScreenState";
import { consultarMinhaAssinatura, MinhaAssinatura } from "@services/planoService";
import { usageLevel } from "@utils/upgradeConversion";
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    load().catch(() => undefined);
  }, [load]);

  if (loading) return <ScreenState loading title="Carregando seu plano" />;

  if (error || !assinatura) {
    return (
      <ScreenState
        title="Não foi possível carregar seu plano"
        description="Verifique sua conexão e tente novamente."
        actionLabel="Tentar novamente"
        onAction={() => load().catch(() => undefined)}
      />
    );
  }

  const { plano, uso } = assinatura;
  const gratuito = plano.codigo === "FREE";
  const obrasLevel = usageLevel(uso.obras, uso.limiteObras);

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
          level={obrasLevel}
          helper={obrasLevel === "limit" ? "Limite atingido" : undefined}
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
          <Text style={styles.upgradeEyebrow}>EXPANDA SEUS PROJETOS</Text>
          <Text style={styles.upgradeTitle}>Conheça o Plano Profissional</Text>
          <Text style={styles.upgradeDescription}>
            Tenha obras ilimitadas, 5 GB de armazenamento e colaboradores ilimitados.
          </Text>
          <AppButton
            label="Conhecer o Profissional"
            icon={<ArrowUpRight size={19} color={colors.surface} />}
            onPress={() => navigation.navigate("PlanoProfissional", { origem: "meu_plano" })}
            style={styles.upgradeButton}
          />
        </View>
      )}
    </ScrollView>
  );
};

type UsageRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper?: string;
  level?: "available" | "warning" | "limit";
  last?: boolean;
};

const UsageRow = ({ icon, label, value, helper, level = "available", last = false }: UsageRowProps) => (
  <View style={[styles.usageRow, !last && styles.usageBorder]}>
    <View style={styles.usageIcon}>{icon}</View>
    <View style={styles.usageLabelWrap}>
      <Text style={styles.usageLabel}>{label}</Text>
      {helper && <Text style={[styles.usageHelper, level === "limit" && styles.usageHelperLimit]}>{helper}</Text>}
    </View>
    <Text style={[styles.usageValue, level === "limit" && styles.usageValueLimit]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center", padding: spacing.lg, paddingBottom: spacing.xxl },
  planCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xl },
  eyebrow: { color: colors.textMuted, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  planRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.sm },
  freeDot: { backgroundColor: "#22C55E" },
  proDot: { backgroundColor: colors.primary },
  planName: { color: colors.text, fontSize: 24, fontWeight: "800" },
  founder: { color: colors.primary, marginTop: spacing.sm, fontWeight: "600" },
  sectionTitle: { ...typography.sectionTitle, marginBottom: spacing.md },
  usageGroup: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: "hidden" },
  usageRow: { minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  usageBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  usageIcon: { width: 38 },
  usageLabelWrap: { flex: 1 },
  usageLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  usageHelper: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  usageHelperLimit: { color: "#B45309", fontWeight: "700" },
  usageValue: { color: colors.textMuted, fontSize: 14, fontWeight: "700", textAlign: "right" },
  usageValueLimit: { color: "#B45309" },
  upgradeCard: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  upgradeEyebrow: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  upgradeTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: spacing.xs },
  upgradeDescription: { color: colors.textMuted, lineHeight: 21, marginTop: spacing.sm },
  upgradeButton: { marginTop: spacing.lg },
});

export default MeuPlanoScreen;
