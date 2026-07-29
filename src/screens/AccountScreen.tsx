import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@context/AuthContext";
import { publicApiUrl } from "@services/apiClient";
import { toastError, toastInfo } from "@utils/toast";

const PRIMARY = "#0C5BAA";

const AccountScreen = () => {
  const { user, signOut, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const open = (path: string) =>
    Linking.openURL(publicApiUrl(path)).catch(() =>
      toastError("Não foi possível abrir a página", "Tente novamente em alguns instantes."),
    );

  const confirmDelete = () => {
    if (!password) {
      toastError("Informe sua senha", "A senha atual confirma que a conta pertence a você.");
      return;
    }
    Alert.alert(
      "Excluir conta permanentemente?",
      "Suas obras sem outro proprietário e todos os arquivos delas serão excluídos. Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir conta",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount(password);
              toastInfo("Conta excluída", "Seus dados foram encaminhados para exclusão.");
            } catch (error) {
              toastError("Não foi possível excluir a conta", (error as Error).message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Dados da conta</Text>
      <View style={styles.account}>
        <Text style={styles.name}>{user?.nome}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Text style={styles.sectionTitle}>Informações e ajuda</Text>
      <View style={styles.links}>
        <TouchableOpacity style={styles.linkRow} onPress={() => open("/privacy.html")}>
          <Text style={styles.linkText}>Política de Privacidade</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => open("/terms.html")}>
          <Text style={styles.linkText}>Termos de Uso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => open("/support.html")}>
          <Text style={styles.linkText}>Ajuda e contato</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sair da conta</Text>
      </TouchableOpacity>

      <View style={styles.danger}>
        <Text style={styles.dangerTitle}>Excluir conta</Text>
        <Text style={styles.description}>
          Informe sua senha atual. Obras sem outro proprietário e seus arquivos serão excluídos
          permanentemente.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Senha atual"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!deleting}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.deleteButton, deleting && styles.disabled]}
          onPress={confirmDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#b42318" />
          ) : (
            <Text style={styles.deleteText}>Excluir minha conta</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    marginTop: 8,
  },
  account: { paddingVertical: 8, marginBottom: 20 },
  name: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  email: { color: "#64748b", marginTop: 4 },
  links: { borderTopWidth: 1, borderTopColor: "#dbe2ea", marginBottom: 20 },
  linkRow: { minHeight: 52, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#dbe2ea" },
  linkText: { color: PRIMARY, fontSize: 16, fontWeight: "600" },
  signOut: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginBottom: 28,
  },
  signOutText: { color: PRIMARY, fontWeight: "700", fontSize: 16 },
  danger: { borderTopWidth: 1, borderTopColor: "#f1b4b4", paddingTop: 20 },
  dangerTitle: { fontSize: 18, fontWeight: "700", color: "#b42318" },
  description: { color: "#64748b", lineHeight: 21, marginTop: 6, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 14,
    minHeight: 48,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  deleteButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  deleteText: { color: "#b42318", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.6 },
});

export default AccountScreen;
