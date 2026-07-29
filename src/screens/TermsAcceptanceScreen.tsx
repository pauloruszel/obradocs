import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@context/AuthContext";
import { publicApiUrl } from "@services/apiClient";
import { toastError } from "@utils/toast";

const PRIMARY = "#0C5BAA";

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

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Obradocs</Text>
      <Text style={styles.title}>Antes de continuar</Text>
      <Text style={styles.description}>
        Revise os documentos que explicam o uso do serviço e o tratamento dos seus dados.
      </Text>
      <TouchableOpacity onPress={() => Linking.openURL(publicApiUrl("/terms.html"))}>
        <Text style={styles.link}>Ler os Termos de Uso</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL(publicApiUrl("/privacy.html"))}>
        <Text style={styles.link}>Ler a Política de Privacidade</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.acceptRow}
        onPress={() => setAccepted((current) => !current)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.acceptText}>
          Li e aceito os Termos de Uso e a Política de Privacidade.
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, (!accepted || submitting) && styles.disabled]}
        disabled={!accepted || submitting}
        onPress={confirm}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continuar</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.exit} onPress={signOut}>
        <Text style={styles.exitText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 28, justifyContent: "center" },
  brand: { color: PRIMARY, fontWeight: "800", fontSize: 18, marginBottom: 24 },
  title: { color: "#0f172a", fontWeight: "800", fontSize: 28, marginBottom: 10 },
  description: { color: "#475569", fontSize: 16, lineHeight: 24, marginBottom: 20 },
  link: { color: PRIMARY, fontWeight: "700", fontSize: 16, paddingVertical: 10 },
  acceptRow: { flexDirection: "row", alignItems: "center", marginVertical: 20, minHeight: 48 },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  checkmark: { color: "#fff", fontWeight: "800" },
  acceptText: { flex: 1, color: "#334155", lineHeight: 21 },
  button: {
    minHeight: 50,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.5 },
  exit: { alignItems: "center", padding: 16, marginTop: 8 },
  exitText: { color: "#64748b", fontWeight: "600" },
});

export default TermsAcceptanceScreen;
