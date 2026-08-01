import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { BadgeCheck, CheckCircle2, Clock3, Download, FileText, MessageSquareWarning } from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Arquivo } from "@models/models";
import { RootStackParamList } from "@navigation/AppNavigator";
import { gerarUrlTemporaria, listarRevisoes } from "@services/arquivosService";
import ScreenState from "@components/ScreenState";
import { formatDateTime, formatFileName } from "@utils/display";
import { toastError } from "@utils/toast";
import { colors, layout, radius, spacing } from "@theme/index";
import {
  AprovacaoFiltro,
  aprovacaoLabel,
  filtrarRevisoesPorAprovacao,
} from "@utils/aprovacao";

type Props = NativeStackScreenProps<RootStackParamList, "RevisoesArquivo">;

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const RevisoesArquivoScreen = ({ route, navigation }: Props) => {
  const { arquivoId, obraId, nome, papel } = route.params;
  const [revisions, setRevisions] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AprovacaoFiltro>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRevisions(await listarRevisoes(arquivoId));
    } catch (loadError) {
      setError((loadError as Error).message || "Não foi possível carregar as revisões.");
    } finally {
      setLoading(false);
    }
  }, [arquivoId]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (item: Arquivo) => {
    try {
      await Linking.openURL(await gerarUrlTemporaria(item.id));
    } catch {
      toastError("Não foi possível baixar esta revisão", "Tente novamente.");
    }
  };

  if (loading) return <ScreenState loading title="Carregando revisões" />;
  if (error) {
    return (
      <ScreenState
        icon={<FileText size={44} color={colors.textMuted} />}
        title="Não foi possível carregar as revisões"
        description={error}
        actionLabel="Tentar novamente"
        onAction={load}
      />
    );
  }

  const filteredRevisions = filtrarRevisoesPorAprovacao(revisions, filter);
  const filters: { value: AprovacaoFiltro; label: string }[] = [
    { value: "ALL", label: "Todas" },
    { value: "PENDING", label: "Pendentes" },
    { value: "APPROVED", label: "Aprovadas" },
    { value: "CHANGES_REQUESTED", label: "Com alterações" },
  ];

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredRevisions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.documentName} numberOfLines={2}>
              {formatFileName(revisions[0]?.documento_nome || nome)}
            </Text>
            <Text style={styles.count}>
              {revisions.length} {revisions.length === 1 ? "revisão" : "revisões"}
            </Text>
            <View style={styles.filters}>
              {filters.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={[styles.filter, filter === item.value && styles.filterActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === item.value }}
                >
                  <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() =>
              navigation.navigate("ArquivoView", {
                arquivoId: item.id,
                obraId,
                path: item.storage_path,
                nome: item.documento_nome,
                tipo: item.tipo,
                papel,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Abrir revisão R${item.revisao}`}
          >
            <View style={styles.revision}>
              <Text style={styles.revisionText}>R{item.revisao}</Text>
            </View>
            <View style={styles.details}>
              <View style={styles.titleRow}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {formatFileName(item.nome_original)}
                </Text>
                {item.atual && (
                  <View style={styles.currentBadge}>
                    <CheckCircle2 size={13} color={colors.primary} />
                    <Text style={styles.currentText}>Atual</Text>
                  </View>
                )}
              </View>
              {!!item.aprovacao_status && (
                <View style={styles.approvalRow}>
                  {item.aprovacao_status === "APPROVED" ? (
                    <BadgeCheck size={14} color={colors.success} />
                  ) : item.aprovacao_status === "CHANGES_REQUESTED" ? (
                    <MessageSquareWarning size={14} color={colors.danger} />
                  ) : (
                    <Clock3 size={14} color={colors.warning} />
                  )}
                  <Text style={styles.approvalText}>{aprovacaoLabel[item.aprovacao_status]}</Text>
                  {item.oficial_aprovada && <Text style={styles.officialText}>· Oficial</Text>}
                </View>
              )}
              <Text style={styles.meta}>
                {formatSize(item.tamanho_bytes)} · {formatDateTime(item.created_at)}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                Enviado por {item.enviado_por_nome || "Usuário não identificado"}
              </Text>
            </View>
            <Pressable
              style={styles.download}
              onPress={() => download(item)}
              accessibilityRole="button"
              accessibilityLabel={`Baixar revisão R${item.revisao}`}
            >
              <Download size={21} color={colors.primary} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={(
          <ScreenState
            icon={<FileText size={42} color={colors.textMuted} />}
            title="Nenhuma revisão neste filtro"
            description="Escolha outro status ou solicite a aprovação de uma revisão disponível."
          />
        )}
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
  header: { marginBottom: spacing.lg },
  documentName: { color: colors.text, fontSize: 20, fontWeight: "800" },
  count: { color: colors.textMuted, marginTop: spacing.xs },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  filter: { minHeight: 40, justifyContent: "center", borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: spacing.md },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  card: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  revision: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  revisionText: { color: colors.primary, fontWeight: "800" },
  details: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  fileName: { flex: 1, color: colors.text, fontWeight: "700" },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  currentText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  approvalRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  approvalText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  officialText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  download: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});

export default RevisoesArquivoScreen;
