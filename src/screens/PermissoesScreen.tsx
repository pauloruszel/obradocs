import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import {
  adicionarPermissao,
  atualizarPermissao,
  buscarUsuarioPorEmail,
  listarPermissoes,
  removerPermissao,
} from "@services/permissoesService";
import { Permissao, Papel } from "@models/models";
import { toastError, toastSuccess, toastInfo } from "@utils/toast";

type Props = NativeStackScreenProps<RootStackParamList, "Permissoes">;

const PermissoesScreen = ({ route }: Props) => {
  const { obraId, isOwner } = route.params;
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [email, setEmail] = useState("");

  const load = async () => {
    try {
      const data = await listarPermissoes(obraId);
      setPermissoes(data);
    } catch (e) {
      console.warn(e);
      const msg = (e as Error)?.message || "";
      const offline = msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch");
      toastError(offline ? "Sem conexao" : "Erro ao carregar permissoes", offline ? "Verifique a internet." : "Tente novamente.");
    }
  };

  useEffect(() => {
    load();
  }, [obraId]);

  const handleAdd = async () => {
    if (!email) return;
    try {
      const user = await buscarUsuarioPorEmail(email.trim());
      if (!user) {
        toastInfo("Usuario nao encontrado");
        return;
      }
      await adicionarPermissao(obraId, user.id, "EDITOR");
      await load();
      setEmail("");
      toastSuccess("Permissao adicionada");
    } catch (e: any) {
      toastError("Erro", e.message || "Nao foi possivel adicionar.");
    }
  };

  const handleUpdate = async (permissao: Permissao, papel: Papel) => {
    await atualizarPermissao(permissao.id, papel);
    load();
  };

  const handleRemove = async (permissao: Permissao) => {
    await removerPermissao(permissao.id);
    load();
  };

  const renderItem = ({ item }: { item: Permissao }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.profiles?.nome || item.user_id}</Text>
        <Text style={styles.subtitle}>{item.profiles?.email}</Text>
        <Text style={styles.chip}>{item.papel}</Text>
      </View>
      {isOwner && item.papel !== "OWNER" && (
        <View style={{ gap: 6 }}>
          <TouchableOpacity style={styles.smallButton} onPress={() => handleUpdate(item, "EDITOR")}>
            <Text style={styles.smallText}>Editor</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => handleUpdate(item, "VIEWER")}>
            <Text style={styles.smallText}>Viewer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={() => handleRemove(item)}>
            <Text style={styles.smallDanger}>Remover</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {isOwner && (
        <View style={styles.addBox}>
          <Text style={styles.label}>Adicionar usuario por e-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="usuario@exemplo.com"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleAdd}>
            <Text style={styles.primaryText}>Adicionar</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={permissoes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum usuario listado.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa", padding: 12 },
  addBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  label: { fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4d9",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  primaryButton: { backgroundColor: "#0C5BAA", padding: 12, borderRadius: 10, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  title: { fontWeight: "700" },
  subtitle: { color: "#6b7280", marginBottom: 4 },
  chip: { color: "#0C5BAA", fontWeight: "700" },
  smallButton: {
    borderWidth: 1,
    borderColor: "#0C5BAA",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  smallText: { color: "#0C5BAA", fontWeight: "700" },
  dangerButton: {
    borderWidth: 1,
    borderColor: "#e11d48",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  smallDanger: { color: "#e11d48", fontWeight: "700" },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 12 },
});

export default PermissoesScreen;
