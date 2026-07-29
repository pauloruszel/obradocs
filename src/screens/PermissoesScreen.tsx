import React, { useEffect, useState } from "react";
import { Alert, View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import {
  atualizarPermissao,
  convidarUsuarioPorEmail,
  listarPermissoes,
  removerPermissao,
} from "@services/permissoesService";
import { Permissao, Papel } from "@models/models";
import { toastError, toastSuccess, toastInfo } from "@utils/toast";
import { papelLabel } from "@utils/display";

type Props = NativeStackScreenProps<RootStackParamList, "Permissoes">;

const PermissoesScreen = ({ route }: Props) => {
  const { obraId, isOwner } = route.params;
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await listarPermissoes(obraId);
      setPermissoes(data);
    } catch (e) {
      console.warn(e);
      const msg = (e as Error)?.message || "";
      const offline = msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch");
      toastError(
        offline ? "Sem conexão" : "Não foi possível carregar as permissões",
        offline ? "Verifique a internet." : "Tente novamente.",
      );
    }
  };

  useEffect(() => {
    load();
  }, [obraId]);

  const handleAdd = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toastInfo("Informe o e-mail");
      return;
    }
    setAdding(true);
    try {
      await convidarUsuarioPorEmail(obraId, trimmed, "EDITOR");
      await load();
      setEmail("");
      toastSuccess("Permissão adicionada");
    } catch (e: any) {
      const msg = (e?.message as string) || "";
      toastError("Não foi possível adicionar", msg || "Tente novamente.");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (permissao: Permissao, papel: Papel) => {
    if (permissao.papel === papel) {
      return;
    }
    setUpdatingId(permissao.id);
    try {
      await atualizarPermissao(obraId, permissao.id, papel);
      await load();
      toastSuccess("Permissão atualizada");
    } catch (e: any) {
      toastError("Não foi possível atualizar", e?.message || "Tente novamente.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (permissao: Permissao) => {
    setUpdatingId(permissao.id);
    try {
      await removerPermissao(obraId, permissao.id);
      await load();
      toastSuccess("Acesso removido");
    } catch (e: any) {
      toastError("Não foi possível remover", e?.message || "Tente novamente.");
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmRemove = (permissao: Permissao) => {
    const name = permissao.profiles?.nome || "este usuário";
    Alert.alert("Remover acesso?", `${name} deixará de acessar esta obra.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => handleRemove(permissao) },
    ]);
  };

  const renderItem = ({ item }: { item: Permissao }) => {
    const name = item.profiles?.nome || item.user_id;
    const initial = name.trim().charAt(0).toUpperCase();
    const updating = updatingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.personRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.title}>{name}</Text>
            {!!item.profiles?.email && <Text style={styles.subtitle}>{item.profiles.email}</Text>}
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{papelLabel[item.papel]}</Text>
          </View>
        </View>
        {isOwner && item.papel !== "OWNER" && (
          <View style={styles.permissionActions}>
            <View style={styles.roleOptions}>
              {(["EDITOR", "VIEWER"] as Papel[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleOption, item.papel === role && styles.roleOptionActive]}
                  onPress={() => handleUpdate(item, role)}
                  disabled={updating}
                  accessibilityState={{ selected: item.papel === role, disabled: updating }}
                >
                  <Text style={[styles.roleOptionText, item.papel === role && styles.roleOptionTextActive]}>
                    {papelLabel[role]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => confirmRemove(item)}
              disabled={updating}
            >
              <Text style={styles.removeText}>{updating ? "Atualizando..." : "Remover"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isOwner && (
        <View style={styles.addBox}>
          <Text style={styles.sectionTitle}>Adicionar usuário</Text>
          <Text style={styles.helper}>Novos usuários entram como Editor.</Text>
          <TextInput
            style={styles.input}
            placeholder="usuario@exemplo.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="done"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity
            style={[styles.primaryButton, (!email.trim() || adding) && styles.buttonDisabled]}
            onPress={handleAdd}
            disabled={!email.trim() || adding}
          >
            <Text style={styles.primaryText}>{adding ? "Adicionando..." : "Adicionar"}</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Pessoas com acesso</Text>
        <Text style={styles.count}>{permissoes.length}</Text>
      </View>
      <FlatList
        data={permissoes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={permissoes.length === 0 ? styles.emptyContent : undefined}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum usuário listado.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa", padding: 16 },
  addBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  sectionTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  helper: { color: "#64748b", marginTop: 4, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4d9",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  primaryButton: { minHeight: 46, backgroundColor: "#0C5BAA", padding: 12, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  buttonDisabled: { opacity: 0.45 },
  primaryText: { color: "#fff", fontWeight: "700" },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  count: { color: "#475569", fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  personRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e0efff", alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { color: "#0C5BAA", fontWeight: "800" },
  personInfo: { flex: 1, minWidth: 0 },
  title: { color: "#0f172a", fontWeight: "700" },
  subtitle: { color: "#64748b", marginTop: 2 },
  roleBadge: { backgroundColor: "#eff6ff", borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8, marginLeft: 8 },
  roleBadgeText: { color: "#0C5BAA", fontSize: 12, fontWeight: "700" },
  permissionActions: { borderTopWidth: 1, borderTopColor: "#e2e8f0", marginTop: 12, paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  roleOptions: { flex: 1, flexDirection: "row" },
  roleOption: { flex: 1, minHeight: 40, borderWidth: 1, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" },
  roleOptionActive: { backgroundColor: "#0C5BAA", borderColor: "#0C5BAA" },
  roleOptionText: { color: "#475569", fontSize: 13, fontWeight: "700" },
  roleOptionTextActive: { color: "#fff" },
  removeButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 4 },
  removeText: { color: "#be123c", fontSize: 13, fontWeight: "700" },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  empty: { textAlign: "center", color: "#64748b" },
});

export default PermissoesScreen;
