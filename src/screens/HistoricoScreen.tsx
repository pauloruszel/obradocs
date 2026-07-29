import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { listarHistorico } from "@services/historicoService";
import { ArquivoTipo, Historico } from "@models/models";
import { arquivoTipoLabel, formatDateTime, formatFileName } from "@utils/display";

type Props = NativeStackScreenProps<RootStackParamList, "Historico">;

const actionLabels: Record<string, string> = {
  CRIACAO_OBRA: "Obra criada",
  ENTROU_OBRA: "Usuário entrou na obra",
  UPLOAD_ARQUIVO: "Arquivo enviado",
  RENOMEAR_OBRA: "Obra renomeada",
  RENOMEAR_ARQUIVO: "Arquivo renomeado",
  EXCLUIR_OBRA: "Obra excluída",
};

const formatAction = (action: string): string =>
  actionLabels[action] ??
  action
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());

const formatDetails = (item: Historico): string | null => {
  const details = item.detalhes;
  if (!details) {
    return null;
  }

  if (item.acao === "UPLOAD_ARQUIVO") {
    const name = typeof details.nomeOriginal === "string" ? formatFileName(details.nomeOriginal) : "";
    const tipo =
      typeof details.tipo === "string" && details.tipo in arquivoTipoLabel
        ? arquivoTipoLabel[details.tipo as ArquivoTipo]
        : "";
    return [name, tipo].filter(Boolean).join(" · ") || null;
  }

  const readableValue = [
    details.novoNome,
    details.nomeNovo,
    details.nome,
    details.nomeOriginal,
    details.email,
  ].find((value) => typeof value === "string");

  return typeof readableValue === "string" ? formatFileName(readableValue) : null;
};

const HistoricoScreen = ({ route }: Props) => {
  const { obraId } = route.params;
  const [logs, setLogs] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarHistorico(obraId)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [obraId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={logs.length === 0 ? styles.emptyContent : styles.listContent}
        renderItem={({ item }) => {
          const details = formatDetails(item);
          const actor = item.profiles?.nome;
          return (
            <View style={styles.card}>
              <View style={styles.marker} />
              <View style={styles.cardContent}>
                <Text style={styles.title}>{formatAction(item.acao)}</Text>
                {!!details && <Text style={styles.detail}>{details}</Text>}
                <Text style={styles.subtitle}>
                  {[actor, formatDateTime(item.created_at)].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nenhuma atividade registrada</Text>
            <Text style={styles.empty}>As alterações desta obra aparecerão aqui.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16 },
  emptyContent: { flexGrow: 1, padding: 16, justifyContent: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    overflow: "hidden",
  },
  marker: { width: 4, backgroundColor: "#0C5BAA" },
  cardContent: { flex: 1, padding: 14 },
  title: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  subtitle: { color: "#64748b", marginTop: 6, fontSize: 13 },
  detail: { color: "#334155", marginTop: 4 },
  emptyBox: { alignItems: "center", paddingHorizontal: 24 },
  emptyTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700", textAlign: "center" },
  empty: { textAlign: "center", color: "#64748b", marginTop: 6 },
});

export default HistoricoScreen;
