import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import { colors, radius, spacing } from "@theme/index";

type Props = {
  visible: boolean;
  currentName: string;
  onCancel: () => void;
  onSave: (novoNome: string) => Promise<void> | void;
  loading?: boolean;
  title?: string;
  label?: string;
  helper?: string;
};

const RenameObraModal = ({
  visible,
  currentName,
  onCancel,
  onSave,
  loading,
  title = "Renomear obra",
  label = "Novo nome da obra",
  helper = "Use um nome descritivo para localizar facilmente sua obra.",
}: Props) => {
  const [nomeLocal, setNomeLocal] = useState(currentName);

  useEffect(() => {
    if (visible) {
      setNomeLocal(currentName);
    }
  }, [visible, currentName]);

  const handleSubmit = () => {
    onSave(nomeLocal);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>{title}</Text>
          <AppInput
            label={label}
            placeholder="Digite o novo nome"
            value={nomeLocal}
            onChangeText={setNomeLocal}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!loading}
            helper={helper}
          />
          <View style={styles.actions}>
            <AppButton
              label="Cancelar"
              onPress={onCancel}
              disabled={loading}
              variant="secondary"
              style={styles.button}
            />
            <AppButton
              label="Salvar"
              onPress={handleSubmit}
              loading={loading}
              style={styles.button}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

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
  title: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: spacing.lg },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  button: { flex: 1 },
});

export default RenameObraModal;
