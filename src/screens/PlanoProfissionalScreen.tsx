import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, Crown, HardDrive, Infinity, ShieldCheck, Sparkles, UsersRound } from "lucide-react-native";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import { registrarInteresseUpgrade } from "@services/upgradeInterestService";
import { toastError, toastSuccess } from "@utils/toast";
import { colors, layout, radius, spacing, typography } from "@theme/index";

const benefits = [
  { icon: Infinity, title: "Obras ilimitadas", description: "Centralize todos os seus projetos sem precisar excluir obras antigas." },
  { icon: HardDrive, title: "5 GB de armazenamento", description: "Mais espaço para fotos, projetos, notas fiscais e documentos." },
  { icon: UsersRound, title: "Colaboradores ilimitados", description: "Compartilhe cada obra com toda a equipe envolvida." },
  { icon: ShieldCheck, title: "Continuidade e evolução", description: "Apoie o Obradocs e receba as próximas melhorias do produto." },
];

const comparisons = [
  ["Obras", "1", "Ilimitadas"],
  ["Armazenamento", "500 MB", "5 GB"],
  ["Colaboradores", "1 por obra", "Ilimitados"],
  ["Compartilhamento", "Incluído", "Incluído"],
];

const PlanoProfissionalScreen = () => {
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const registrar = async () => {
    setSubmitting(true);
    try {
      await registrarInteresseUpgrade({ telefone: telefone.trim() || undefined, empresa: empresa.trim() || undefined });
      setRegistered(true);
      toastSuccess("Interesse registrado", "Você entrou na lista para receber as condições de lançamento.");
    } catch (error) {
      toastError("Não foi possível registrar", (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.heroBadge}><Sparkles size={15} color={colors.primary} /><Text style={styles.heroBadgeText}>PARA QUEM QUER CRESCER</Text></View>
        <View style={styles.crownWrap}><Crown size={30} color={colors.surface} /></View>
        <Text style={styles.heroTitle}>Plano Profissional</Text>
        <Text style={styles.heroSubtitle}>Organize todas as suas obras em um único lugar.</Text>
        <View style={styles.priceRow}><Text style={styles.currency}>R$</Text><Text style={styles.price}>24,90</Text><Text style={styles.period}>/mês</Text></View>
        <Text style={styles.priceNote}>Sem fidelidade. Oferta comercial sujeita à disponibilidade.</Text>
      </View>

      <Text style={styles.sectionTitle}>Tudo o que você precisa para trabalhar sem limites</Text>
      <View style={styles.benefitGrid}>
        {benefits.map(({ icon: Icon, title, description }) => (
          <View key={title} style={styles.benefitCard}>
            <View style={styles.benefitIcon}><Icon size={22} color={colors.primary} /></View>
            <View style={styles.benefitContent}><Text style={styles.benefitTitle}>{title}</Text><Text style={styles.benefitDescription}>{description}</Text></View>
          </View>
        ))}
      </View>

      <View style={styles.launchCard}>
        <View style={styles.launchHeader}><Sparkles size={21} color={colors.primary} /><Text style={styles.launchTitle}>Condição especial de lançamento</Text></View>
        <Text style={styles.launchText}>Os primeiros clientes poderão receber uma condição exclusiva de fundador quando as assinaturas forem liberadas.</Text>
      </View>

      <Text style={styles.sectionTitle}>Compare os planos</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}><Text style={[styles.cellFeature, styles.headerText]}>Recurso</Text><Text style={[styles.cell, styles.headerText]}>Gratuito</Text><Text style={[styles.cell, styles.proHeader]}>Profissional</Text></View>
        {comparisons.map(([feature, free, pro], index) => (
          <View key={feature} style={[styles.tableRow, index < comparisons.length - 1 && styles.tableBorder]}>
            <Text style={styles.cellFeature}>{feature}</Text><Text style={styles.cell}>{free}</Text>
            <View style={styles.proCell}><Check size={15} color={colors.success} /><Text style={styles.proText}>{pro}</Text></View>
          </View>
        ))}
      </View>

      <View style={styles.interestCard}>
        {registered ? (
          <View style={styles.successBox}>
            <View style={styles.successIcon}><Check size={26} color={colors.success} /></View>
            <Text style={styles.interestTitle}>Você está na lista</Text>
            <Text style={styles.interestText}>Seu interesse foi registrado. Entraremos em contato quando o Plano Profissional estiver disponível.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.interestTitle}>Quero ser um dos primeiros clientes</Text>
            <Text style={styles.interestText}>Seu nome e e-mail serão preenchidos pela sua conta. Telefone e empresa são opcionais.</Text>
            <View style={styles.form}>
              <AppInput label="Telefone (opcional)" value={telefone} onChangeText={setTelefone} placeholder="(21) 99999-9999" keyboardType="phone-pad" editable={!submitting} maxLength={30} />
              <AppInput label="Empresa ou escritório (opcional)" value={empresa} onChangeText={setEmpresa} placeholder="Ex.: Escritório Paulo Arquitetura" editable={!submitting} maxLength={150} />
              <AppButton label="Tenho interesse" onPress={registrar} loading={submitting} />
            </View>
          </>
        )}
      </View>
      <Text style={styles.footerNote}>Nenhuma cobrança será realizada nesta etapa.</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center", padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.xl, alignItems: "center" },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  heroBadgeText: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 0.7 },
  crownWrap: { width: 62, height: 62, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)", marginTop: spacing.lg },
  heroTitle: { color: colors.surface, fontSize: 30, fontWeight: "900", marginTop: spacing.md },
  heroSubtitle: { color: colors.surface, opacity: 0.88, fontSize: 16, textAlign: "center", marginTop: spacing.xs },
  priceRow: { flexDirection: "row", alignItems: "flex-end", marginTop: spacing.lg },
  currency: { color: colors.surface, fontSize: 18, fontWeight: "800", marginBottom: 7, marginRight: 4 },
  price: { color: colors.surface, fontSize: 43, lineHeight: 49, fontWeight: "900" },
  period: { color: colors.surface, opacity: 0.82, marginBottom: 8, marginLeft: 4 },
  priceNote: { color: colors.surface, opacity: 0.72, fontSize: 12, textAlign: "center", marginTop: spacing.xs },
  sectionTitle: { ...typography.sectionTitle, marginTop: spacing.xl, marginBottom: spacing.md },
  benefitGrid: { gap: spacing.sm },
  benefitCard: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  benefitIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  benefitContent: { flex: 1 }, benefitTitle: { color: colors.text, fontSize: 16, fontWeight: "800" }, benefitDescription: { color: colors.textMuted, lineHeight: 20, marginTop: 3 },
  launchCard: { marginTop: spacing.xl, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.lg },
  launchHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, launchTitle: { color: colors.text, fontSize: 17, fontWeight: "800" }, launchText: { color: colors.textMuted, lineHeight: 21, marginTop: spacing.sm },
  table: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: "hidden" }, tableRow: { flexDirection: "row", alignItems: "center", minHeight: 54, paddingHorizontal: spacing.sm }, tableHeader: { backgroundColor: colors.primarySoft }, tableBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  cellFeature: { flex: 1.35, color: colors.text, fontSize: 13, fontWeight: "700" }, cell: { flex: 1, color: colors.textMuted, fontSize: 12, textAlign: "center" }, headerText: { color: colors.text, fontWeight: "800" }, proHeader: { color: colors.primary, fontWeight: "800" }, proCell: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 3 }, proText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  interestCard: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  interestTitle: { color: colors.text, fontSize: 20, fontWeight: "900" }, interestText: { color: colors.textMuted, lineHeight: 21, marginTop: spacing.sm }, form: { gap: spacing.lg, marginTop: spacing.lg },
  successBox: { alignItems: "center", paddingVertical: spacing.md }, successIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, marginBottom: spacing.md },
  footerNote: { color: colors.textMuted, textAlign: "center", fontSize: 12, marginTop: spacing.sm },
});

export default PlanoProfissionalScreen;
