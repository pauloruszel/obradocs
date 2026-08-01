import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from "react-native";
import {
  BadgeCheck,
  Clock3,
  FilePenLine,
  FileUp,
  FolderPen,
  FolderPlus,
  LogIn,
  MessageSquareWarning,
  Trash2,
} from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { listarHistoricoPagina } from "@services/historicoService";
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
  NOVA_REVISAO: "Nova revisão enviada",
  RENOMEAR_OBRA: "Obra renomeada",
  RENOMEAR_ARQUIVO: "Arquivo renomeado",
  EXCLUIR_OBRA: "Obra excluída",
  APROVACAO_SOLICITADA: "Aprovação solicitada",
  REVISAO_APROVADA: "Revisão aprovada",
  ALTERACOES_SOLICITADAS: "Alterações solicitadas",
};

const actionIcons: Record<string, React.ElementType> = {
  CRIACAO_OBRA: FolderPlus,
  ENTROU_OBRA: LogIn,
  UPLOAD_ARQUIVO: FileUp,
  NOVA_REVISAO: FileUp,
  RENOMEAR_OBRA: FolderPen,
  RENOMEAR_ARQUIVO: FilePenLine,
  EXCLUIR_OBRA: Trash2,
  APROVACAO_SOLICITADA: Clock3,
  REVISAO_APROVADA: BadgeCheck,
  ALTERACOES_SOLICITADAS: MessageSquareWarning,
};

const formatAction = (action: string) =>
  actionLabels[action] ||
  action.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

const clientActions = new Set([
  "UPLOAD_ARQUIVO",
  "NOVA_REVISAO",
  "APROVACAO_SOLICITADA",
  "REVISAO_APROVADA",
  "ALTERACOES_SOLICITADAS",
]);

const formatDetails = (item: Historico): string | null => {
  const details = item.detalhes;
  if (!details) return null;

  if (item.acao === "UPLOAD_ARQUIVO" || item.acao === "NOVA_REVISAO") {
    const nameValue = details.nome ?? details.nomeOriginal;
    const name = typeof nameValue === "string" ? formatFileName(nameValue) : "";
    const type =
      typeof details.tipo === "string" && details.tipo in arquivoTipoLabel
        ? arquivoTipoLabel[details.tipo as ArquivoTipo]
        : "";
    const revision =
      typeof details.revisao === "number" ? `R${details.revisao}` : "";
    return [name, revision, type].filter(Boolean).join(" · ") || null;
  }

  if (["APROVACAO_SOLICITADA", "REVISAO_APROVADA", "ALTERACOES_SOLICITADAS"].includes(item.acao)) {
    const revision = typeof details.revisao === "number" ? `R${details.revisao}` : "";
    const comment = typeof details.comentario === "string" ? details.comentario : "";
    return [revision, comment].filter(Boolean).join(" · ") || null;
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
  const { obraId, clientPortal = false } = route.params;
  const [logs, setLogs] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback((nextPage = 0) => {
    if (nextPage > 0) setLoadingMore(true);
    return listarHistoricoPagina(obraId, nextPage)
      .then((response) => {
        setLogs((current) => nextPage === 0 ? response.items : [...current, ...response.items]);
        setPage(response.page);
        setHasMore(response.has_more);
      })
      .catch((error) => toastError("Não foi possível carregar o histórico", (error as Error).message))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [obraId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const sections = useMemo(() => {
    const groups = new Map<string, Historico[]>();
    const visibleLogs = clientPortal ? logs.filter((item) => clientActions.has(item.acao)) : logs;
    visibleLogs.forEach((item) => {
      const key = formatDate(item.created_at) || "Data não informada";
      groups.set(key, [...(groups.get(key) || []), item]);
    });
    return Array.from(groups, ([title, data]) => ({ title, data }));
  }, [clientPortal, logs]);

  if (loading) return <ScreenState loading title="Carregando histórico" />;

  return (
    <View style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.content}
        onEndReached={() => {
          if (hasMore && !loadingMore) load(page + 1).catch(() => undefined);
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : null}
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
            title={clientPortal ? "Nenhuma atualização de documentos" : "Nenhuma atividade registrada"}
            description={clientPortal
              ? "Envios, revisões e decisões de aprovação aparecerão aqui."
              : "As alterações realizadas nesta obra aparecerão aqui."}
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
