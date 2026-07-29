import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { entrarPorCodigo } from "@services/obrasService";
import { useAuth } from "@context/AuthContext";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { toastError, toastSuccess } from "@utils/toast";

type Props = NativeStackScreenProps<RootStackParamList, "EntrarObra">;

const EntrarObraScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [codigo, setCodigo] = useState("");

  const handleEnter = async () => {
    if (!user) return;
    try {
      const obra = await entrarPorCodigo(codigo.trim());
      toastSuccess("Acesso liberado", "Você entrou na obra.");
      navigation.navigate("ObraDetail", { obraId: obra.id, nome: obra.nome });
    } catch (e: any) {
      toastError("Obra não encontrada", e.message || "Verifique o código informado.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Código da obra</Text>
      <TextInput
        style={styles.input}
        placeholder="XXXX-XXXX"
        autoCapitalize="characters"
        value={codigo}
        onChangeText={setCodigo}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleEnter}>
        <Text style={styles.primaryText}>Entrar</Text>
      </TouchableOpacity>
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
  primaryButton: { backgroundColor: "#0C5BAA", padding: 14, borderRadius: 10, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700" },
});

export default EntrarObraScreen;
