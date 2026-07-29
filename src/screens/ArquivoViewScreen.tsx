import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import WebView from "react-native-webview";
import { FileText, MoreVertical, Pencil, ShieldAlert } from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Arquivo } from "@models/models";
import { RootStackParamList } from "@navigation/AppNavigator";
import {
  buscarArquivo,
  gerarUrlTemporaria,
  renomearArquivo,
} from "@services/arquivosService";
import { toastError, toastSuccess } from "@utils/toast";
import { arquivoTipoLabel, formatDateTime, formatFileName } from "@utils/display";
import ActionMenu, { ActionMenuItem } from "@components/ActionMenu";
import AppButton from "@components/AppButton";
import RenameObraModal from "@components/RenameObraModal";
import ScreenState from "@components/ScreenState";
import { colors, radius, spacing } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "ArquivoView">;

const ArquivoViewScreen = ({ route, navigation }: Props) => {
  const { arquivoId, papel = "VIEWER" } = route.params;
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<Arquivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renameVisible, setRenameVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const displayName = formatFileName(meta?.nome_original || route.params.nome || "");
  const canEdit = papel === "OWNER" || papel === "EDITOR";

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Arquivo",
      headerRight: () => (
        <Pressable
          style={styles.headerMenu}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir ações do arquivo"
        >
          <MoreVertical size={23} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [signedUrl, file] = await Promise.all([
        gerarUrlTemporaria(arquivoId),
        buscarArquivo(arquivoId),
      ]);
      setUrl(signedUrl);
      setMeta(file);
    } catch (error) {
      setLoadError((error as Error)?.message || "Não foi possível abrir o arquivo.");
    } finally {
      setLoading(false);
    }
  }, [arquivoId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toastError("Nome inválido", "Informe um nome para o arquivo.");
      return;
    }
    setSaving(true);
    try {
      setMeta(await renomearArquivo(arquivoId, trimmed));
      setRenameVisible(false);
      toastSuccess("Nome atualizado");
    } catch (error) {
      toastError("Não foi possível renomear", (error as Error).message || "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const menuItems: ActionMenuItem[] = [
    ...(canEdit
      ? [
          {
            label: "Renomear arquivo",
            icon: <Pencil size={20} color={colors.text} />,
            onPress: () => setRenameVisible(true),
          },
        ]
      : []),
    {
      label: "Denunciar conteúdo",
      icon: <ShieldAlert size={20} color={colors.text} />,
      onPress: () =>
        navigation.navigate("ReportContent", {
          targetType: "ARQUIVO",
          targetId: arquivoId,
          title: displayName,
        }),
    },
  ];

  if (loading) return <ScreenState loading title="Carregando arquivo" />;
  if (loadError || !url || !meta) {
    return (
      <ScreenState
        icon={<FileText size={44} color={colors.textMuted} />}
        title="Não foi possível abrir o arquivo"
        description={loadError || "Tente novamente."}
        actionLabel="Tentar novamente"
        onAction={load}
      />
    );
  }

  const isPdf =
    meta.content_type === "application/pdf" || displayName.toLowerCase().endsWith(".pdf");
  const fileSize =
    meta.tamanho_bytes >= 1024 * 1024
      ? `${(meta.tamanho_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(meta.tamanho_bytes / 1024))} KB`;

  return (
    <View style={styles.container}>
      <View style={styles.metadata}>
        <Text style={styles.title} numberOfLines={2}>{displayName}</Text>
        <Text style={styles.subtitle}>
          {[arquivoTipoLabel[meta.tipo], fileSize, formatDateTime(meta.created_at)]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>

      <View style={styles.viewer}>
        {isPdf && Platform.OS === "android" ? (
          <View style={styles.pdfFallback}>
            <View style={styles.pdfIcon}>
              <FileText size={34} color={colors.primary} />
            </View>
            <Text style={styles.pdfTitle}>Documento PDF</Text>
            <Text style={styles.pdfDescription}>
              Abra o documento no visualizador instalado no seu aparelho.
            </Text>
            <AppButton
              label="Abrir PDF"
              onPress={() =>
                Linking.openURL(url).catch(() =>
                  toastError("Não foi possível abrir o PDF", "Tente novamente."),
                )
              }
              style={styles.openButton}
            />
          </View>
        ) : isPdf ? (
          <WebView source={{ uri: url }} style={styles.webView} />
        ) : (
          <Image source={{ uri: url }} style={styles.image} />
        )}
      </View>

      <ActionMenu
        visible={menuVisible}
        title="Ações do arquivo"
        items={menuItems}
        onClose={() => setMenuVisible(false)}
      />
      <RenameObraModal
        visible={renameVisible}
        currentName={displayName}
        title="Renomear arquivo"
        label="Novo nome do arquivo"
        helper="Mantenha a extensão para identificar corretamente o formato."
        onCancel={() => setRenameVisible(false)}
        onSave={saveName}
        loading={saving}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerMenu: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  metadata: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: "700" },
  subtitle: { color: colors.textMuted, marginTop: spacing.xs, fontSize: 13 },
  viewer: { flex: 1, backgroundColor: "#EEF2F6" },
  webView: { flex: 1, backgroundColor: "#EEF2F6" },
  image: { flex: 1, width: "100%", resizeMode: "contain" },
  pdfFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  pdfIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: spacing.lg },
  pdfDescription: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  openButton: { minWidth: 180 },
});

export default ArquivoViewScreen;
