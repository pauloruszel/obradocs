import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import AppButton from "@components/AppButton";
import { colors, radius, spacing } from "@theme/index";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={() => {
      if (!loading) onCancel();
    }}
  >
    <View style={styles.overlay}>
      <View style={styles.card} accessibilityViewIsModal>
        <View style={[styles.iconContainer, destructive && styles.iconContainerDanger]}>
          <AlertTriangle size={26} color={destructive ? colors.danger : colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <AppButton
            label={cancelLabel}
            onPress={onCancel}
            variant="secondary"
            disabled={loading}
            style={styles.button}
          />
          <AppButton
            label={loading ? "Excluindo..." : confirmLabel}
            accessibilityLabel={loading ? "Excluindo obra" : confirmLabel}
            onPress={onConfirm}
            variant={destructive ? "danger" : "primary"}
            loading={loading}
            style={styles.button}
          />
        </View>
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
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  iconContainerDanger: {
    backgroundColor: colors.dangerSoft,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  button: { flex: 1 },
});

export default ConfirmDialog;
