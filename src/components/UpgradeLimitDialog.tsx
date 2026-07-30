import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Sparkles, X } from "lucide-react-native";
import AppButton from "@components/AppButton";
import { colors, radius, spacing } from "@theme/index";
import { UpgradeLimitCode } from "@utils/upgradeConversion";

type Props = {
  visible: boolean;
  limit: UpgradeLimitCode;
  onClose: () => void;
  onUpgrade: () => void;
};

const benefits = ["Obras ilimitadas", "5 GB de armazenamento", "Colaboradores ilimitados"];

const copy: Record<UpgradeLimitCode, { title: string; message: string }> = {
  PLAN_LIMIT_REACHED: {
    title: "Você atingiu o limite de obras",
    message:
      "Seu plano permite 1 obra ativa. Continue usando sua obra normalmente ou conheça o Plano Profissional para expandir seus projetos.",
  },
  STORAGE_LIMIT_REACHED: {
    title: "Seu armazenamento está cheio",
    message:
      "O arquivo não foi enviado porque sua cota de armazenamento chegou ao limite. Conheça o Plano Profissional para ter mais espaço.",
  },
  COLLABORATOR_LIMIT_REACHED: {
    title: "Você atingiu o limite de colaboradores",
    message:
      "Esta obra já possui o número máximo de colaboradores do plano atual. Conheça o Plano Profissional para ampliar sua equipe.",
  },
};

const UpgradeLimitDialog = ({ visible, limit, onClose, onUpgrade }: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.card} accessibilityViewIsModal>
        <Pressable
          onPress={onClose}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        >
          <X size={21} color={colors.textMuted} />
        </Pressable>

        <View style={styles.iconContainer}>
          <Sparkles size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>PLANO GRATUITO</Text>
        <Text style={styles.title}>{copy[limit].title}</Text>
        <Text style={styles.message}>{copy[limit].message}</Text>

        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <CheckCircle2 size={19} color={colors.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <AppButton label="Conhecer o Plano Profissional" onPress={onUpgrade} />
        <AppButton label="Agora não" variant="ghost" onPress={onClose} style={styles.secondaryAction} />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    position: "relative",
  },
  close: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    marginTop: spacing.xs,
    paddingRight: spacing.xl,
  },
  message: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  benefits: {
    gap: spacing.sm,
    marginVertical: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  benefitText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  secondaryAction: { marginTop: spacing.sm },
});

export default UpgradeLimitDialog;
