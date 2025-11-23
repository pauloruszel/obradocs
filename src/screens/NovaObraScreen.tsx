import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "@context/AuthContext";
import { criarObra } from "@services/obrasService";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { toastError, toastInfo, toastSuccess } from "@utils/toast";

type Props = NativeStackScreenProps<RootStackParamList, "NovaObra">;

const NovaObraScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user) return;
    if (!nome) {
      toastInfo("Informe um nome");
      return;
    }
    try {
      const obra = await criarObra(nome, user.id);
      setCodigo(obra.codigo_compartilhamento);
      toastSuccess("Obra criada", `Codigo: ${obra.codigo_compartilhamento}`);
    } catch (e: any) {
      toastError("Erro ao criar obra", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nome da obra</Text>
      <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Reforma Casa" />
      <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
        <Text style={styles.primaryText}>Salvar</Text>
      </TouchableOpacity>
      {codigo && (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Codigo de compartilhamento</Text>
          <Text style={styles.code}>{codigo}</Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("ObrasList")}
          >
            <Text style={styles.secondaryText}>Voltar para lista</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa", padding: 16 },
  label: { fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4d9",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#0C5BAA",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  codeBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d0d4d9",
  },
  codeLabel: { fontWeight: "600", marginBottom: 4 },
  code: { fontSize: 20, fontWeight: "700", color: "#0C5BAA" },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#0C5BAA",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#0C5BAA", fontWeight: "600" },
});

export default NovaObraScreen;
