import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";
import { colors, radius, spacing } from "@theme/index";

type Props = {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
};

const SearchField = ({ value, placeholder, onChangeText }: Props) => (
  <View style={styles.container}>
    <Search size={19} color={colors.textMuted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      returnKeyType="search"
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={100}
      accessibilityLabel={placeholder}
      style={styles.input}
    />
    {!!value && (
      <Pressable
        onPress={() => onChangeText("")}
        accessibilityRole="button"
        accessibilityLabel="Limpar busca"
        hitSlop={8}
        style={styles.clearButton}
      >
        <X size={18} color={colors.textMuted} />
      </Pressable>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SearchField;
