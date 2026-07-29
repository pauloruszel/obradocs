import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, spacing } from "@theme/index";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const AppButton = ({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: Props) => {
  const unavailable = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={unavailable}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !unavailable && styles.pressed,
        unavailable && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  label: { fontSize: 15, fontWeight: "700" },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.primary },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  danger: { backgroundColor: colors.surface, borderColor: colors.danger },
  primaryLabel: { color: colors.white },
  secondaryLabel: { color: colors.primary },
  ghostLabel: { color: colors.primary },
  dangerLabel: { color: colors.danger },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
});

export default AppButton;
