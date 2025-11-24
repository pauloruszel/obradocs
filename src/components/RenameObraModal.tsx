import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY_COLOR = "#0C5BAA";

type Props = {
  visible: boolean;
  currentName: string;
  onCancel: () => void;
  onSave: (novoNome: string) => Promise<void> | void;
  loading?: boolean;
};

const RenameObraModal = ({ visible, currentName, onCancel, onSave, loading }: Props) => {
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
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Renomear obra</Text>
          <Text style={styles.label}>Novo nome da obra</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o novo nome"
            value={nomeLocal}
            onChangeText={setNomeLocal}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <Text style={styles.helper}>Use um nome descritivo para localizar facilmente sua obra.</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={onCancel}
              disabled={loading}
              accessibilityLabel="Cancelar renomeacao da obra"
              accessibilityRole="button"
            >
              <Text style={styles.outlineText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.disabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityLabel="Salvar novo nome da obra"
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  title: { fontSize: 19, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4d9",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  helper: { color: "#6b7280", marginTop: 6, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  outlineButton: { borderColor: PRIMARY_COLOR, backgroundColor: "transparent" },
  outlineText: { color: PRIMARY_COLOR, fontWeight: "700" },
  primaryButton: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  primaryText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.75 },
});

export default RenameObraModal;
