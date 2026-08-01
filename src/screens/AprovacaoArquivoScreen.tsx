import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  BadgeCheck,
  Clock3,
  FileCheck2,
  MessageSquareWarning,
  Send,
  Upload,
  Users,
} from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "@context/AuthContext";
import { Arquivo, Historico, Permissao } from "@models/models";
import { RootStackParamList } from "@navigation/AppNavigator";
import {
  buscarArquivo,
  decidirAprovacao,
  solicitarAprovacao,
} from "@services/arquivosService";
import { listarHistorico } from "@services/historicoService";
import { listarPermissoes } from "@services/permissoesService";
import { aprovacaoLabel } from "@utils/aprovacao";
import { formatDateTime, formatFileName } from "@utils/display";
import { toastError, toastSuccess } from "@utils/toast";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import ScreenState from "@components/ScreenState";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "AprovacaoArquivo">;

const approvalActions = new Set([
  "APROVACAO_SOLICITADA",
  "REVISAO_APROVADA",
  "ALTERACOES_SOLICITADAS",
]);

const historyLabel: Record<string, string> = {
  APROVACAO_SOLICITADA: "Aprovação solicitada",
  REVISAO_APROVADA: "Revisão aprovada",
  ALTERACOES_SOLICITADAS: "Alterações solicitadas",
};

const AprovacaoArquivoScreen = ({ route, navigation }: Props) => {
  const { arquivoId, obraId } = route.params;
  const { user } = useAuth();
  const [arquivo, setArquivo] = useState<Arquivo | null>(null);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [file, permissions, history] = await Promise.all([
        buscarArquivo(arquivoId),
        listarPermissoes(obraId),
        listarHistorico(obraId),
      ]);
      setArquivo(file);
      setPermissoes(permissions);
      setHistorico(history);
    } catch (requestError) {
      setError((requestError as Error).message || "Não foi possível carregar a aprovação.");
    } finally {
      setLoading(false);
    }
  }, [arquivoId, obraId]);

  useEffect(() => {
    load();
  }, [load]);

  const papel = permissoes.find((item) => item.user_id === user?.id)?.papel;
  const canRequest = papel === "OWNER" || papel === "EDITOR";
  const canDecide = papel === "OWNER";
  const approvers = permissoes.filter((item) => item.papel === "OWNER");
  const approvalHistory = useMemo(
    () => historico.filter((item) =>
      approvalActions.has(item.acao) && String(item.detalhes?.arquivoId) === arquivoId),
    [arquivoId, historico],
  );

  const personName = (id?: string | null) =>
    permissoes.find((item) => item.user_id === id)?.profiles?.nome || "Usuário";

  const updateHistory = async () => setHistorico(await listarHistorico(obraId));

  const requestApproval = async () => {
    setSaving(true);
    try {
      setArquivo(await solicitarAprovacao(arquivoId));
      await updateHistory();
      toastSuccess("Aprovação solicitada", "Os proprietários da obra foram notificados.");
    } catch (requestError) {
      toastError("Não foi possível solicitar aprovação", (requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const decide = async (decision: "APPROVED" | "CHANGES_REQUESTED") => {
    if (decision === "CHANGES_REQUESTED" && !comentario.trim()) {
      toastError("Comentário obrigatório", "Explique o que deve ser ajustado.");
      return;
    }
    setSaving(true);
    try {
      setArquivo(await decidirAprovacao(arquivoId, decision, comentario));
      setComentario("");
      await updateHistory();
      toastSuccess(decision === "APPROVED" ? "Revisão aprovada" : "Alterações solicitadas");
    } catch (requestError) {
      toastError("Não foi possível concluir", (requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenState loading title="Carregando aprovação" />;
  if (error || !arquivo) {
    return (
      <ScreenState
        icon={<FileCheck2 size={44} color={colors.textMuted} />}
        title="Não foi possível carregar a aprovação"
        description={error || "Tente novamente."}
        actionLabel="Tentar novamente"
        onAction={load}
      />
    );
  }

  const status = arquivo.aprovacao_status;
  const statusColor = status === "APPROVED"
    ? colors.success
    : status === "CHANGES_REQUESTED"
      ? colors.danger
      : status === "PENDING"
        ? colors.warning
        : colors.textMuted;
  const StatusIcon = status === "APPROVED"
    ? BadgeCheck
    : status === "CHANGES_REQUESTED"
      ? MessageSquareWarning
      : Clock3;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.documentCard}>
        <Text style={styles.documentName} numberOfLines={2}>
          {formatFileName(arquivo.documento_nome || arquivo.nome_original)}
        </Text>
        <Text style={styles.meta}>R{arquivo.revisao} · Enviado por {arquivo.enviado_por_nome || "usuário não identificado"}</Text>
      </View>

      <View style={[styles.statusCard, { borderLeftColor: statusColor }]}>
        <View style={styles.statusTitleRow}>
          <StatusIcon size={21} color={statusColor} />
          <Text style={[styles.statusTitle, { color: statusColor }]}>
            {status ? aprovacaoLabel[status] : "Sem solicitação de aprovação"}
          </Text>
        </View>
        {arquivo.oficial_aprovada && <Text style={styles.official}>Esta é a revisão oficial aprovada.</Text>}
        {status === "PENDING" && (
          <Text style={styles.description}>
            Solicitada por {personName(arquivo.aprovacao_solicitada_por)} em {formatDateTime(arquivo.aprovacao_solicitada_at || undefined)}.
          </Text>
        )}
        {status === "APPROVED" && (
          <Text style={styles.description}>
            Decidida por {personName(arquivo.aprovacao_decidida_por)} em {formatDateTime(arquivo.aprovacao_decidida_at || undefined)}.
          </Text>
        )}
        {status === "CHANGES_REQUESTED" && (
          <>
            <Text style={styles.description}>{arquivo.aprovacao_comentario}</Text>
            <Text style={styles.nextAction}>Envie uma nova revisão após realizar os ajustes.</Text>
          </>
        )}
        {!status && (
          <Text style={styles.description}>
            Solicite a análise quando esta revisão estiver pronta para ser validada.
          </Text>
        )}
      </View>

      {!status && canRequest && (
        <AppButton
          label="Solicitar aprovação"
          icon={<Send size={18} color={colors.white} />}
          onPress={requestApproval}
          loading={saving}
        />
      )}
      {!status && !canRequest && (
        <Text style={styles.guidance}>Somente proprietários e editores podem solicitar aprovação.</Text>
      )}

      {status === "PENDING" && canDecide && (
        <View style={styles.decisionCard}>
          <Text style={styles.sectionTitle}>Registrar decisão</Text>
          <AppInput
            label="Comentário"
            helper="Obrigatório apenas ao solicitar alterações."
            placeholder="Descreva os ajustes necessários"
            value={comentario}
            onChangeText={setComentario}
            multiline
            maxLength={1000}
          />
          <View style={styles.decisionActions}>
            <AppButton
              label="Solicitar alterações"
              variant="danger"
              onPress={() => decide("CHANGES_REQUESTED")}
              disabled={saving}
              style={styles.action}
            />
            <AppButton
              label="Aprovar"
              icon={<BadgeCheck size={18} color={colors.white} />}
              onPress={() => decide("APPROVED")}
              loading={saving}
              style={styles.action}
            />
          </View>
        </View>
      )}
      {status === "PENDING" && !canDecide && (
        <Text style={styles.guidance}>Aguardando a decisão de um proprietário da obra.</Text>
      )}
      {status === "CHANGES_REQUESTED" && canRequest && (
        <AppButton
          label="Enviar nova revisão"
          icon={<Upload size={18} color={colors.white} />}
          onPress={() => navigation.navigate("UploadArquivo", {
            obraId,
            arquivoId,
            tipo: arquivo.tipo,
            documentoNome: arquivo.documento_nome,
            contentType: arquivo.content_type,
            papel,
          })}
        />
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Users size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Aprovadores</Text>
        </View>
        {approvers.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum proprietário disponível para aprovar esta revisão.</Text>
        ) : approvers.map((item) => (
          <View key={item.id} style={styles.person}>
            <Text style={styles.personName}>{item.profiles?.nome || "Proprietário"}</Text>
            {!!item.profiles?.email && <Text style={styles.meta}>{item.profiles.email}</Text>}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Histórico de decisões</Text>
        {approvalHistory.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma decisão registrada. Solicite a aprovação para iniciar o fluxo.</Text>
        ) : approvalHistory.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <Text style={styles.historyTitle}>{historyLabel[item.acao]}</Text>
            <Text style={styles.meta}>{item.profiles?.nome || "Usuário"} · {formatDateTime(item.created_at)}</Text>
            {typeof item.detalhes?.comentario === "string" && (
              <Text style={styles.historyComment}>{item.detalhes.comentario}</Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
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
    gap: spacing.md,
  },
  documentCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  documentName: { color: colors.text, fontSize: 19, fontWeight: "800" },
  meta: { ...typography.caption, marginTop: spacing.xs },
  statusCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderRadius: radius.md, padding: spacing.lg },
  statusTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusTitle: { flex: 1, fontSize: 16, fontWeight: "800" },
  official: { color: colors.success, fontWeight: "700", marginTop: spacing.sm },
  description: { ...typography.body, marginTop: spacing.sm },
  nextAction: { color: colors.text, fontWeight: "700", marginTop: spacing.sm },
  guidance: { ...typography.caption, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  decisionCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  decisionActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  action: { flexGrow: 1, flexBasis: 220 },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionTitle: { ...typography.sectionTitle },
  emptyText: { ...typography.caption, marginTop: spacing.md },
  person: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.md },
  personName: { color: colors.text, fontWeight: "700" },
  historyItem: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.md },
  historyTitle: { color: colors.text, fontWeight: "700" },
  historyComment: { ...typography.body, marginTop: spacing.sm },
});

export default AprovacaoArquivoScreen;
