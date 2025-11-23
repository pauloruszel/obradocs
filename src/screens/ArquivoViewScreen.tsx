import { Arquivo } from "@models/models";
import { RootStackParamList } from "@navigation/AppNavigator";
import { gerarUrlTemporaria } from "@services/arquivosService";
import { supabase } from "@services/supabase";
import { toastError } from "@utils/toast";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import WebView from "react-native-webview";

type Props = NativeStackScreenProps<RootStackParamList, "ArquivoView">;

const ArquivoViewScreen = ({ route, navigation }: Props) => {
  const { path, tipo, arquivoId } = route.params;
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<Arquivo | null>(null);

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

  if (!url) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const isPdf = (meta?.nome_original || "").toLowerCase().endsWith(".pdf") || tipo === "PROJETO";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{meta?.nome_original}</Text>
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
  title: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#6b7280", marginBottom: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default ArquivoViewScreen;
