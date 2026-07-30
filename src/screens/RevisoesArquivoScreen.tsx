import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Download, FileText } from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Arquivo } from "@models/models";
import { RootStackParamList } from "@navigation/AppNavigator";
import { gerarUrlTemporaria, listarRevisoes } from "@services/arquivosService";
import ScreenState from "@components/ScreenState";
import { formatDateTime, formatFileName } from "@utils/display";
import { toastError } from "@utils/toast";
import { colors, layout, radius, spacing } from "@theme/index";

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

  return (
    <View style={styles.screen}>
      <FlatList
        data={revisions}
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
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  download: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});

export default RevisoesArquivoScreen;
