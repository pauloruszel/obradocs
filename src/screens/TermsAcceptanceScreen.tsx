import React, { useState } from "react";
import { Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Check, ChevronRight, FileText, ShieldCheck } from "lucide-react-native";
import { useAuth } from "@context/AuthContext";
import { publicApiUrl } from "@services/apiClient";
import { toastError } from "@utils/toast";
import AppButton from "@components/AppButton";
import { colors, radius, spacing } from "@theme/index";

const TermsAcceptanceScreen = () => {
  const { acceptTerms, signOut } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      await acceptTerms();
    } catch (error) {
      toastError("Não foi possível registrar o aceite", (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const documents = [
    {
      label: "Termos de Uso",
      description: "Regras para utilizar o Obradocs",
      icon: FileText,
      path: "/terms.html",
    },
    {
      label: "Política de Privacidade",
      description: "Como seus dados são tratados",
      icon: ShieldCheck,
      path: "/privacy.html",
    },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.brand}>Obradocs</Text>
        <Text style={styles.title}>Antes de continuar</Text>
        <Text style={styles.description}>
          Revise os documentos sobre o uso do serviço e o tratamento dos seus dados.
        </Text>

        <View style={styles.documents}>
          {documents.map(({ label, description, icon: Icon, path }, index) => (
            <Pressable
              key={label}
              style={({ pressed }) => [
                styles.document,
                index === 0 && styles.documentBorder,
                pressed && styles.pressed,
              ]}
              onPress={() => Linking.openURL(publicApiUrl(path))}
              accessibilityRole="link"
            >
              <View style={styles.documentIcon}>
                <Icon size={21} color={colors.primary} />
              </View>
              <View style={styles.documentText}>
                <Text style={styles.documentTitle}>{label}</Text>
                <Text style={styles.documentDescription}>{description}</Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.acceptRow}
          onPress={() => setAccepted((current) => !current)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Check size={18} color={colors.white} strokeWidth={3} />}
          </View>
          <Text style={styles.acceptText}>
            Li e aceito os Termos de Uso e a Política de Privacidade.
          </Text>
        </Pressable>

        <AppButton
          label="Aceitar e continuar"
          onPress={confirm}
          loading={submitting}
          disabled={!accepted}
        />
        <AppButton
          label="Sair da conta"
          onPress={signOut}
          variant="ghost"
          disabled={submitting}
          style={styles.exit}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: spacing.xl,
    justifyContent: "center",
  },
  brand: { color: colors.primary, fontWeight: "800", fontSize: 18, marginBottom: spacing.xl },
  title: { color: colors.text, fontWeight: "800", fontSize: 28 },
  description: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: spacing.sm },
  documents: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
    marginTop: spacing.xl,
  },
  document: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  documentBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.surfaceMuted },
  documentIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  documentText: { flex: 1 },
  documentTitle: { color: colors.text, fontWeight: "700" },
  documentDescription: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  acceptRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xl, minHeight: 48 },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  acceptText: { flex: 1, color: colors.text, lineHeight: 21 },
  exit: { marginTop: spacing.sm },
});

export default TermsAcceptanceScreen;
