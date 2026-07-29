import { Arquivo } from "@models/models";
import { RootStackParamList } from "@navigation/AppNavigator";
import {
  buscarArquivo,
  gerarUrlTemporaria,
  renomearArquivo,
} from "@services/arquivosService";
import { toastError, toastSuccess } from "@utils/toast";
import { arquivoTipoLabel, formatDateTime, formatFileName } from "@utils/display";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import WebView from "react-native-webview";

type Props = NativeStackScreenProps<RootStackParamList, "ArquivoView">;

const ArquivoViewScreen = ({ route, navigation }: Props) => {
  const { arquivoId, papel = "VIEWER" } = route.params;
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<Arquivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState(false);
  const [novoNome, setNovoNome] = useState(route.params.nome || "");
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [signed, arquivo] = await Promise.all([
        gerarUrlTemporaria(arquivoId),
        buscarArquivo(arquivoId),
      ]);
      setUrl(signed);
      setMeta(arquivo);
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível abrir o arquivo.");
    } finally {
      setLoading(false);
    }
  }, [arquivoId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (meta?.nome_original) {
      setNovoNome(formatFileName(meta.nome_original));
    }
  }, [meta]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0C5BAA" />
        <Text style={styles.loadingText}>Carregando arquivo...</Text>
      </View>
    );
  }

  if (loadError || !url || !meta) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>Não foi possível abrir o arquivo</Text>
        <Text style={styles.errorText}>{loadError || "Tente novamente."}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.primaryText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = formatFileName(meta.nome_original);
  const isPdf =
    meta.content_type === "application/pdf" || displayName.toLowerCase().endsWith(".pdf");
  const canEditar = papel === "OWNER" || papel === "EDITOR";
  const fileSize =
    meta.tamanho_bytes >= 1024 * 1024
      ? `${(meta.tamanho_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(meta.tamanho_bytes / 1024))} KB`;

  const handleSalvarNome = async () => {
    const trimmed = novoNome.trim();
    if (!trimmed) {
      toastError("Digite um nome válido");
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
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{displayName}</Text>
          {canEditar && !renomeando && (
            <TouchableOpacity style={styles.linkButton} onPress={() => setRenomeando(true)}>
              <Text style={styles.linkText}>Renomear</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>
          {[arquivoTipoLabel[meta.tipo], fileSize, formatDateTime(meta.created_at)].filter(Boolean).join(" · ")}
        </Text>
        {canEditar && renomeando && (
          <View style={styles.renameBox}>
            <Text style={styles.inputLabel}>Nome do arquivo</Text>
            <TextInput
              style={styles.input}
              value={novoNome}
              onChangeText={setNovoNome}
              placeholder="Novo nome do arquivo"
              selectTextOnFocus
            />
            <View style={styles.renameActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setRenomeando(false);
                  setNovoNome(displayName);
                }}
              >
                <Text style={styles.secondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, salvando && styles.buttonDisabled]}
                onPress={handleSalvarNome}
                disabled={salvando}
              >
                <Text style={styles.primaryText}>{salvando ? "Salvando..." : "Salvar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      <View style={styles.viewer}>
        {isPdf ? (
          <WebView source={{ uri: url }} style={styles.webView} />
        ) : (
          <Image source={{ uri: url }} style={styles.image} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#0f172a", fontSize: 18, fontWeight: "700", flex: 1, marginRight: 12 },
  subtitle: { color: "#64748b", marginTop: 6, fontSize: 13 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f8fa" },
  loadingText: { color: "#64748b", marginTop: 10 },
  errorState: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f8fa",
  },
  errorTitle: { color: "#0f172a", fontSize: 18, fontWeight: "700", textAlign: "center" },
  errorText: { color: "#64748b", marginTop: 6, marginBottom: 16, textAlign: "center" },
  retryButton: {
    minHeight: 46,
    minWidth: 180,
    backgroundColor: "#0C5BAA",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 6, paddingHorizontal: 20 },
  viewer: { flex: 1, backgroundColor: "#eef2f6" },
  webView: { flex: 1, backgroundColor: "#eef2f6" },
  image: { flex: 1, width: "100%", resizeMode: "contain" },
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  inputLabel: { color: "#334155", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4d9",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  renameActions: { flexDirection: "row", gap: 8 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#0C5BAA",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#0C5BAA", fontWeight: "700" },
  primaryButton: {
    flex: 1,
    backgroundColor: "#0C5BAA",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  buttonDisabled: { opacity: 0.55 },
});

export default ArquivoViewScreen;
