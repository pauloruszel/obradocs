import React, { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@theme/index";
import AppButton from "@components/AppButton";

type Props = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

const ScreenState = ({
  title,
  description,
  icon,
  loading = false,
  actionLabel,
  onAction,
}: Props) => (
  <View style={styles.container}>
    {loading ? <ActivityIndicator size="large" color={colors.primary} /> : icon}
    {!!title && <Text style={styles.title}>{title}</Text>}
    {!!description && <Text style={styles.description}>{description}</Text>}
    {!!actionLabel && !!onAction && (
      <AppButton label={actionLabel} onPress={onAction} style={styles.action} />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: { ...typography.sectionTitle, textAlign: "center", marginTop: spacing.md },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 360,
  },
  action: { marginTop: spacing.lg, minWidth: 180 },
});

export default ScreenState;
