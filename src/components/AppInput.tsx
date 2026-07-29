import React, { ReactNode } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, radius, spacing } from "@theme/index";

type Props = TextInputProps & {
  label: string;
  helper?: string;
  error?: string;
  rightAccessory?: ReactNode;
};

const AppInput = ({ label, helper, error, rightAccessory, style, ...props }: Props) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputFrame, props.multiline && styles.multiline, !!error && styles.inputError]}>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.multilineInput, style]}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={props.accessibilityLabel || label}
      />
      {!!rightAccessory && <View style={styles.accessory}>{rightAccessory}</View>}
    </View>
    {!!error && <Text style={styles.error}>{error}</Text>}
    {!error && !!helper && <Text style={styles.helper}>{helper}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { width: "100%" },
  label: { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: spacing.sm },
  inputFrame: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  accessory: { flexShrink: 0 },
  multiline: { minHeight: 144, textAlignVertical: "top" },
  multilineInput: { minHeight: 142, textAlignVertical: "top" },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
  helper: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
});

export default AppInput;
