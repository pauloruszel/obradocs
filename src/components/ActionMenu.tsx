import React, { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { runAfterActionMenuClose } from "@utils/actionMenu";
import { colors, radius, spacing } from "@theme/index";

export type ActionMenuItem = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  items: ActionMenuItem[];
  onClose: () => void;
};

const ActionMenu = ({ visible, title, items, onClose }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.overlay, { paddingBottom: spacing.lg + insets.bottom }]}
        onPress={onClose}
      >
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              style={styles.close}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar menu"
            >
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          {items.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => runAfterActionMenuClose(onClose, item.onPress)}
              accessibilityRole="button"
            >
              {item.icon}
              <Text style={[styles.itemText, item.destructive && styles.destructive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    paddingBottom: spacing.md,
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "700" },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  item: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  itemPressed: { backgroundColor: colors.surfaceMuted },
  itemText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  destructive: { color: colors.danger },
});

export default ActionMenu;
