import { Arquivo } from "@models/models";
import { RootStackParamList } from "@navigation/AppNavigator";
import { gerarUrlTemporaria, renomearArquivo } from "@services/arquivosService";
import { supabase } from "@services/supabase";
import { toastError, toastSuccess } from "@utils/toast";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import WebView from "react-native-webview";

type Props = NativeStackScreenProps<RootStackParamList, "ArquivoView">;

const ArquivoViewScreen = ({ route, navigation }: Props) => {
  const { path, tipo, arquivoId, papel = "VIEWER" } = route.params;
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<Arquivo | null>(null);
  const [renomeando, setRenomeando] = useState(false);
  const [novoNome, setNovoNome] = useState(route.params.nome || "");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const signed = await gerarUrlTemporaria(path);
        if (!signed) {
          throw new Error("Nao foi possivel gerar link temporario para o arquivo.");
        }
        setUrl(signed);
        const { data, error } = await supabase.from("arquivos").select("*").eq("id", arquivoId).single();
        if (error) {
          throw error;
        }
        setMeta(data as Arquivo);
      } catch (e: any) {
        toastError("Erro", e?.message || "Nao foi possivel abrir o arquivo.");
        navigation.goBack();
      }
    };
    load();
  }, [path, arquivoId, navigation]);

  useEffect(() => {
    if (meta?.nome_original) {
      setNovoNome(meta.nome_original);
    }
  }, [meta]);

  if (!url) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const isPdf = (meta?.nome_original || "").toLowerCase().endsWith(".pdf") || tipo === "PROJETO";
  const canEditar = papel === "OWNER" || papel === "EDITOR";

  const handleSalvarNome = async () => {
    const trimmed = novoNome.trim();
    if (!trimmed) {
      toastError("Digite um nome valido");
      return;
    }
    setSalvando(true);
    try {
      const atualizado = await renomearArquivo(arquivoId, trimmed);
      setMeta(atualizado);
      setRenomeando(false);
      toastSuccess("Nome atualizado");
    } catch (e: any) {
      toastError("Erro ao renomear", e?.message || "Tente novamente");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{meta?.nome_original}</Text>
        {canEditar && !renomeando && (
          <TouchableOpacity style={styles.linkButton} onPress={() => setRenomeando(true)}>
            <Text style={styles.linkText}>Renomear</Text>
          </TouchableOpacity>
        )}
      </View>
      {canEditar && renomeando && (
        <View style={styles.renameBox}>
          <TextInput
            style={styles.input}
            value={novoNome}
            onChangeText={setNovoNome}
            placeholder="Novo nome do arquivo"
          />
          <View style={styles.renameActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => { setRenomeando(false); setNovoNome(meta?.nome_original || ""); }}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, salvando && { opacity: 0.7 }]}
              onPress={handleSalvarNome}
              disabled={salvando}
            >
              <Text style={styles.primaryText}>{salvando ? "Salvando..." : "Salvar"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Text style={styles.subtitle}>{meta?.created_at ? new Date(meta.created_at).toLocaleString() : ""}</Text>
      {isPdf ? (
        <WebView source={{ uri: url }} style={{ flex: 1 }} />
      ) : (
        <Image source={{ uri: url }} style={{ width: "100%", height: 400, resizeMode: "contain" }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  title: { fontSize: 18, fontWeight: "700", flex: 1, marginRight: 12 },
  subtitle: { color: "#6b7280", marginBottom: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0C5BAA",
  },
  linkText: { color: "#0C5BAA", fontWeight: "700" },
  renameBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4d9",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  renameActions: { flexDirection: "row", gap: 8 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#0C5BAA",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#0C5BAA", fontWeight: "700" },
  primaryButton: {
    flex: 1,
    backgroundColor: "#0C5BAA",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700" },
});

export default ArquivoViewScreen;
