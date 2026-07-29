import React, { useEffect, useMemo, useState } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
import {
  FilePenLine,
  FileUp,
  FolderPen,
  FolderPlus,
  LogIn,
  Trash2,
} from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { listarHistorico } from "@services/historicoService";
import { ArquivoTipo, Historico } from "@models/models";
import {
  arquivoTipoLabel,
  formatDate,
  formatFileName,
  formatTime,
} from "@utils/display";
import ScreenState from "@components/ScreenState";
import { colors, layout, radius, spacing } from "@theme/index";
import { toastError } from "@utils/toast";

type Props = NativeStackScreenProps<RootStackParamList, "Historico">;

const actionLabels: Record<string, string> = {
  CRIACAO_OBRA: "Obra criada",
  ENTROU_OBRA: "Pessoa adicionada à obra",
  UPLOAD_ARQUIVO: "Arquivo enviado",
  RENOMEAR_OBRA: "Obra renomeada",
  RENOMEAR_ARQUIVO: "Arquivo renomeado",
  EXCLUIR_OBRA: "Obra excluída",
};

const actionIcons: Record<string, React.ElementType> = {
  CRIACAO_OBRA: FolderPlus,
  ENTROU_OBRA: LogIn,
  UPLOAD_ARQUIVO: FileUp,
  RENOMEAR_OBRA: FolderPen,
  RENOMEAR_ARQUIVO: FilePenLine,
  EXCLUIR_OBRA: Trash2,
};

const formatAction = (action: string) =>
  actionLabels[action] ||
  action.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

const formatDetails = (item: Historico): string | null => {
  const details = item.detalhes;
  if (!details) return null;

  if (item.acao === "UPLOAD_ARQUIVO") {
    const name = typeof details.nomeOriginal === "string" ? formatFileName(details.nomeOriginal) : "";
    const type =
      typeof details.tipo === "string" && details.tipo in arquivoTipoLabel
        ? arquivoTipoLabel[details.tipo as ArquivoTipo]
        : "";
    return [name, type].filter(Boolean).join(" · ") || null;
  }

  const value = [
    details.novoNome,
    details.nomeNovo,
    details.nome,
    details.nomeOriginal,
    details.email,
  ].find((detail) => typeof detail === "string");
  return typeof value === "string" ? formatFileName(value) : null;
};

const HistoricoScreen = ({ route }: Props) => {
  const { obraId } = route.params;
  const [logs, setLogs] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarHistorico(obraId)
      .then(setLogs)
      .catch((error) => toastError("Não foi possível carregar o histórico", (error as Error).message))
      .finally(() => setLoading(false));
  }, [obraId]);

  const sections = useMemo(() => {
    const groups = new Map<string, Historico[]>();
    logs.forEach((item) => {
      const key = formatDate(item.created_at) || "Data não informada";
      groups.set(key, [...(groups.get(key) || []), item]);
    });
    return Array.from(groups, ([title, data]) => ({ title, data }));
  }, [logs]);

  if (loading) return <ScreenState loading title="Carregando histórico" />;

  return (
    <View style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={logs.length === 0 ? styles.emptyContent : styles.content}
        renderSectionHeader={({ section }) => <Text style={styles.dateHeader}>{section.title}</Text>}
        renderItem={({ item, index, section }) => {
          const Icon = actionIcons[item.acao] || FilePenLine;
          const details = formatDetails(item);
          return (
            <View style={styles.timelineRow}>
              <View style={styles.timeline}>
                <View style={styles.icon}>
                  <Icon size={18} color={item.acao === "EXCLUIR_OBRA" ? colors.danger : colors.primary} />
                </View>
                {index < section.data.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{formatAction(item.acao)}</Text>
                  <Text style={styles.time}>{formatTime(item.created_at)}</Text>
                </View>
                {!!details && <Text style={styles.detail}>{details}</Text>}
                {!!item.profiles?.nome && <Text style={styles.actor}>Por {item.profiles.nome}</Text>}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <ScreenState
            icon={<FileUp size={42} color={colors.textMuted} />}
            title="Nenhuma atividade registrada"
            description="As alterações realizadas nesta obra aparecerão aqui."
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emptyContent: { flexGrow: 1 },
  dateHeader: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textTransform: "capitalize",
  },
  timelineRow: { flexDirection: "row" },
  timeline: { width: 42, alignItems: "center" },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  line: { position: "absolute", top: 34, bottom: 0, width: 2, backgroundColor: colors.border },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginLeft: spacing.sm,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
  time: { color: colors.textMuted, fontSize: 12 },
  detail: { color: colors.text, marginTop: spacing.sm },
  actor: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 },
});

export default HistoricoScreen;
