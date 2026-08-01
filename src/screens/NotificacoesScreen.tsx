import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { BadgeCheck, Bell, CheckCheck, Clock3, FileUp, LogIn, MessageSquareWarning, RefreshCw, UserRoundPlus } from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import {
  listarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  Notificacao,
} from "@services/notificacoesService";
import { mensagemNotificacao } from "@utils/notificacoes";
import { formatDateTime } from "@utils/display";
import { toastError, toastSuccess } from "@utils/toast";
import AppButton from "@components/AppButton";
import ScreenState from "@components/ScreenState";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "Notificacoes">;

const iconFor = (action: string) => {
  if (action === "ENTROU_OBRA") return LogIn;
  if (action === "ACESSO_CONCEDIDO") return UserRoundPlus;
  if (action === "APROVACAO_SOLICITADA") return Clock3;
  if (action === "REVISAO_APROVADA") return BadgeCheck;
  if (action === "ALTERACOES_SOLICITADAS") return MessageSquareWarning;
  return FileUp;
};

const NotificacoesScreen = ({ navigation }: Props) => {
  const [items, setItems] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(false);
    try {
      const notifications = await listarNotificacoes();
      setItems([...notifications].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (requestError) {
      setError(true);
      if (refresh) {
        toastError("Não foi possível atualizar", (requestError as Error).message || "Tente novamente.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const unreadCount = items.filter((item) => !item.lida_at).length;

  const openNotification = (item: Notificacao) => {
    if (!item.lida_at) {
      const readAt = new Date().toISOString();
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, lida_at: readAt } : entry));
      marcarNotificacaoComoLida(item.id).catch((requestError) => {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, lida_at: null } : entry));
        toastError("Não foi possível marcar como lida", (requestError as Error).message);
      });
    }

    if (item.acao === "ENTROU_OBRA") {
      navigation.navigate("Permissoes", { obraId: item.obra_id, isOwner: true });
      return;
    }
    if (
      ["APROVACAO_SOLICITADA", "REVISAO_APROVADA", "ALTERACOES_SOLICITADAS"].includes(item.acao)
      && typeof item.detalhes?.arquivoId === "string"
    ) {
      navigation.navigate("AprovacaoArquivo", {
        arquivoId: item.detalhes.arquivoId,
        obraId: item.obra_id,
      });
      return;
    }
    navigation.navigate("ObraDetail", {
      obraId: item.obra_id,
      nome: item.obra_nome || "Obra",
    });
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await marcarTodasNotificacoesComoLidas();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, lida_at: item.lida_at || readAt })));
      toastSuccess("Notificações marcadas como lidas");
    } catch (requestError) {
      toastError("Não foi possível concluir", (requestError as Error).message || "Tente novamente.");
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) return <ScreenState loading title="Carregando notificações" />;
  if (error && items.length === 0) {
    return (
      <ScreenState
        icon={<Bell size={42} color={colors.textMuted} />}
        title="Não foi possível carregar as notificações"
        description="Verifique sua conexão e tente novamente."
        actionLabel="Tentar novamente"
        onAction={() => load().catch(() => undefined)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.toolbar}>
          <View style={styles.heading}>
            <Text style={styles.title}>Atualizações recentes</Text>
            <Text style={styles.subtitle}>
              {unreadCount === 0 ? "Tudo lido" : `${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`}
            </Text>
          </View>
          <Pressable
            style={styles.refreshButton}
            onPress={() => load(true).catch(() => undefined)}
            accessibilityRole="button"
            accessibilityLabel="Atualizar notificações"
          >
            <RefreshCw size={20} color={colors.primary} />
          </Pressable>
          <AppButton
            label="Marcar todas como lidas"
            icon={<CheckCheck size={18} color={colors.primary} />}
            variant="secondary"
            onPress={markAllAsRead}
            loading={markingAll}
            disabled={unreadCount === 0}
            style={styles.markAllButton}
          />
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true).catch(() => undefined)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          )}
          contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
          renderItem={({ item }) => {
            const unread = !item.lida_at;
            const Icon = iconFor(item.acao);
            return (
              <Pressable
                onPress={() => openNotification(item)}
                style={({ pressed }) => [
                  styles.card,
                  unread && styles.cardUnread,
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${unread ? "Não lida. " : ""}${mensagemNotificacao(item)} Obra ${item.obra_nome || "não informada"}`}
              >
                <View style={[styles.icon, unread && styles.iconUnread]}>
                  <Icon size={20} color={colors.primary} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.workName, unread && styles.unreadText]} numberOfLines={1}>
                      {item.obra_nome || "Obra"}
                    </Text>
                    {unread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={[styles.message, unread && styles.unreadText]}>
                    {mensagemNotificacao(item)}
                  </Text>
                  <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={(
            <ScreenState
              icon={<Bell size={42} color={colors.textMuted} />}
              title="Nenhuma notificação"
              description="Novos arquivos, aprovações, revisões e alterações de acesso aparecerão aqui."
            />
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  content: { flex: 1, width: "100%", maxWidth: layout.maxContentWidth, padding: spacing.lg },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heading: { flex: 1, minWidth: 120 },
  title: { ...typography.sectionTitle },
  subtitle: { ...typography.caption, marginTop: 2 },
  refreshButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  markAllButton: { width: "100%", minHeight: 44, paddingHorizontal: spacing.md },
  list: { paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  card: {
    minHeight: 104,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardUnread: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  cardPressed: { opacity: 0.76 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.md,
  },
  iconUnread: { backgroundColor: colors.surface },
  cardContent: { flex: 1, minWidth: 0 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  workName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "700" },
  unreadText: { fontWeight: "800" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  message: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  date: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
});

export default NotificacoesScreen;
