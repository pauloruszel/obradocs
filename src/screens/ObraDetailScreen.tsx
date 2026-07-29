import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  Camera,
  FileText,
  History,
  MoreVertical,
  Pencil,
  ReceiptText,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
} from "lucide-react-native";
import { RootStackParamList } from "@navigation/AppNavigator";
import { Arquivo, ArquivoTipo } from "@models/models";
import { listarArquivos } from "@services/arquivosService";
import { listarPermissoes } from "@services/permissoesService";
import { useAuth } from "@context/AuthContext";
import { toastError, toastSuccess } from "@utils/toast";
import { arquivoTipoLabel, formatDateTime, formatFileName, papelLabel } from "@utils/display";
import { renomearObra, excluirObra } from "@services/obrasService";
import RenameObraModal from "@components/RenameObraModal";
import ActionMenu, { ActionMenuItem } from "@components/ActionMenu";
import AppButton from "@components/AppButton";
import SearchField from "@components/SearchField";
import ScreenState from "@components/ScreenState";
import { colors, layout, radius, spacing } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "ObraDetail">;

const categorias: ArquivoTipo[] = ["ORCAMENTO", "NOTA_FISCAL", "PROJETO", "FOTO"];

const categoryIcon: Record<ArquivoTipo, React.ElementType> = {
  ORCAMENTO: ReceiptText,
  NOTA_FISCAL: FileText,
  PROJETO: FileText,
  FOTO: Camera,
};

const ObraDetailScreen = ({ route, navigation }: Props) => {
  const { obraId, nome } = route.params;
  const { user } = useAuth();
  const [selected, setSelected] = useState<ArquivoTipo>("FOTO");
  const [filesByCategory, setFilesByCategory] = useState<Partial<Record<ArquivoTipo, Arquivo[]>>>({});
  const [loadingCategory, setLoadingCategory] = useState<ArquivoTipo | null>("FOTO");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Arquivo[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [papel, setPapel] = useState<"OWNER" | "EDITOR" | "VIEWER">("VIEWER");
  const [obraNome, setObraNome] = useState(nome);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const canEdit = papel === "OWNER" || papel === "EDITOR";
  const arquivos = filesByCategory[selected] || [];
  const searchActive = query.trim().length > 0;
  const displayedFiles = searchActive ? searchResults : arquivos;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: obraNome,
      headerRight: () => (
        <Pressable
          style={styles.headerMenu}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir ações da obra"
        >
          <MoreVertical size={23} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, obraNome]);

  const loadPermission = useCallback(async () => {
    if (!user) return;
    try {
      const permissions = await listarPermissoes(obraId);
      const current = permissions.find((item) => item.user_id === user.id);
      if (current) setPapel(current.papel);
    } catch (error) {
      const offline = /network|fetch/i.test((error as Error)?.message || "");
      toastError(
        offline ? "Sem conexão" : "Não foi possível carregar seu acesso",
        offline ? "Verifique sua internet." : "Tente novamente.",
      );
    }
  }, [obraId, user]);

  const loadFiles = useCallback(
    async (category: ArquivoTipo) => {
      try {
        const result = await listarArquivos(obraId, category);
        setFilesByCategory((current) => ({
          ...current,
          [category]: result.filter((file) => file.tipo === category),
        }));
      } catch (error) {
        const offline = /network|fetch/i.test((error as Error)?.message || "");
        toastError(
          offline ? "Sem conexão" : "Não foi possível carregar os arquivos",
          offline ? "Verifique sua internet." : "Verifique seu acesso à obra.",
        );
      } finally {
        setLoadingCategory((current) => (current === category ? null : current));
      }
    },
    [obraId],
  );

  useFocusEffect(
    useCallback(() => {
      loadPermission();
      loadFiles(selected);
    }, [loadFiles, loadPermission, selected]),
  );

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await listarArquivos(obraId, undefined, term);
        if (active) setSearchResults(result);
      } catch (error) {
        if (!active) return;
        const offline = /network|fetch/i.test((error as Error)?.message || "");
        toastError(
          offline ? "Sem conexão" : "Não foi possível realizar a busca",
          offline ? "Verifique sua internet." : "Tente novamente.",
        );
      } finally {
        if (active) setSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [obraId, query]);

  const selectCategory = (category: ArquivoTipo) => {
    if (category === selected) return;
    setSelected(category);
    if (filesByCategory[category] === undefined) {
      setLoadingCategory(category);
      loadFiles(category);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (searchActive) {
      try {
        const [, result] = await Promise.all([
          loadPermission(),
          listarArquivos(obraId, undefined, query),
        ]);
        setSearchResults(result);
      } catch {
        toastError("Não foi possível atualizar a busca", "Tente novamente.");
      }
    } else {
      await Promise.all([loadPermission(), loadFiles(selected)]);
    }
    setRefreshing(false);
  };

  const handleRename = async (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed.length < 3) {
      toastError("Nome muito curto", "Use pelo menos 3 caracteres.");
      return;
    }
    setRenameLoading(true);
    try {
      const updated = await renomearObra(obraId, trimmed);
      setObraNome(updated.nome);
      navigation.setParams({ obraId, nome: updated.nome });
      setRenameVisible(false);
      toastSuccess("Nome atualizado");
    } catch {
      toastError("Não foi possível atualizar o nome", "Tente novamente.");
    } finally {
      setRenameLoading(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Excluir obra permanentemente?",
      "A obra e seus documentos deixarão de aparecer para todos. Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir obra",
          style: "destructive",
          onPress: async () => {
            try {
              await excluirObra(obraId);
              toastSuccess("Obra excluída");
              navigation.popToTop();
            } catch {
              toastError("Não foi possível excluir a obra", "Tente novamente.");
            }
          },
        },
      ],
    );
  };

  const menuItems: ActionMenuItem[] = (() => {
    const items: ActionMenuItem[] = [];
    if (canEdit) {
      items.push({
        label: "Renomear obra",
        icon: <Pencil size={20} color={colors.text} />,
        onPress: () => setRenameVisible(true),
      });
    }
    items.push({
      label: "Denunciar conteúdo",
      icon: <ShieldAlert size={20} color={colors.text} />,
      onPress: () =>
        navigation.navigate("ReportContent", {
          targetType: "OBRA",
          targetId: obraId,
          title: obraNome,
        }),
    });
    if (canEdit) {
      items.push({
        label: "Excluir obra",
        icon: <Trash2 size={20} color={colors.danger} />,
        onPress: confirmDelete,
        destructive: true,
      });
    }
    return items;
  })();

  const renderFile = ({ item }: { item: Arquivo }) => {
    const Icon = categoryIcon[item.tipo];
    const size =
      item.tamanho_bytes >= 1024 * 1024
        ? `${(item.tamanho_bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(item.tamanho_bytes / 1024))} KB`;

    return (
      <Pressable
        style={({ pressed }) => [styles.fileCard, pressed && styles.fileCardPressed]}
        onPress={() =>
          navigation.navigate("ArquivoView", {
            arquivoId: item.id,
            obraId,
            path: item.storage_path,
            nome: item.nome_original,
            tipo: item.tipo,
            papel,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Abrir arquivo ${formatFileName(item.nome_original)}`}
      >
        <View style={styles.fileIcon}>
          <Icon size={21} color={colors.primary} />
        </View>
        <View style={styles.fileContent}>
          <Text style={styles.fileName} numberOfLines={2}>
            {formatFileName(item.nome_original)}
          </Text>
          <Text style={styles.fileMeta}>
            {searchActive ? `${arquivoTipoLabel[item.tipo]} · ` : ""}
            {size} · {formatDateTime(item.created_at)}
          </Text>
          {!!item.enviado_por_nome && (
            <Text style={styles.fileAuthor} numberOfLines={1}>
              Enviado por {item.enviado_por_nome}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.summary}>
          <View style={styles.summaryText}>
            <Text style={styles.obraTitle} numberOfLines={2}>{obraNome}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{papelLabel[papel]}</Text>
          </View>
        </View>

        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar documento nesta obra"
        />

        {searchActive ? (
          <Text style={styles.searchCount}>
            {searching
              ? "Buscando documentos..."
              : `${searchResults.length} ${searchResults.length === 1 ? "documento encontrado" : "documentos encontrados"}`}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {categorias.map((category) => {
              const Icon = categoryIcon[category];
              const active = selected === category;
              return (
                <Pressable
                  key={category}
                  style={[styles.category, active && styles.categoryActive]}
                  onPress={() => selectCategory(category)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Icon size={17} color={active ? colors.white : colors.textMuted} />
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                    {arquivoTipoLabel[category]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.shortcuts}>
          <AppButton
            label="Histórico"
            variant="secondary"
            icon={<History size={18} color={colors.primary} />}
            onPress={() => navigation.navigate("Historico", { obraId })}
            style={styles.shortcut}
          />
          <AppButton
            label="Permissões"
            variant="secondary"
            icon={<Users size={18} color={colors.primary} />}
            onPress={() =>
              navigation.navigate("Permissoes", { obraId, isOwner: papel === "OWNER" })
            }
            style={styles.shortcut}
          />
        </View>

        {!searchActive &&
        loadingCategory === selected &&
        filesByCategory[selected] === undefined ? (
          <ScreenState loading title={`Carregando ${arquivoTipoLabel[selected].toLowerCase()}s`} />
        ) : (
          <FlatList
            data={displayedFiles}
            keyExtractor={(item) => item.id}
            renderItem={renderFile}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={displayedFiles.length === 0 ? styles.emptyList : styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              searchActive && searching ? (
                <ScreenState loading title="Buscando documentos" />
              ) : searchActive ? (
                <ScreenState
                  icon={<FileText size={42} color={colors.textMuted} />}
                  title="Nenhum documento encontrado"
                  description="Tente buscar por outro nome."
                  actionLabel="Limpar busca"
                  onAction={() => setQuery("")}
                />
              ) : (
                <ScreenState
                  icon={<FileText size={42} color={colors.textMuted} />}
                  title="Nenhum arquivo nesta categoria"
                  description={
                    canEdit
                      ? "Envie o primeiro documento para começar a organizar esta obra."
                      : "Quando um documento for enviado, ele aparecerá aqui."
                  }
                />
              )
            }
          />
        )}
      </View>

      {canEdit && (
        <AppButton
          label="Enviar arquivo"
          icon={<Upload size={19} color={colors.white} />}
          onPress={() => navigation.navigate("UploadArquivo", { obraId })}
          style={styles.floatingAction}
        />
      )}

      <ActionMenu
        visible={menuVisible}
        title="Ações da obra"
        items={menuItems}
        onClose={() => setMenuVisible(false)}
      />
      <RenameObraModal
        visible={renameVisible}
        currentName={obraNome}
        onCancel={() => setRenameVisible(false)}
        onSave={handleRename}
        loading={renameLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerMenu: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  summary: {
    minHeight: 72,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  summaryText: { flex: 1, minWidth: 0 },
  obraTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  roleBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  roleBadgeText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  searchCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: spacing.md,
  },
  categories: { gap: spacing.sm, paddingVertical: spacing.md },
  category: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.textMuted, fontWeight: "700" },
  categoryTextActive: { color: colors.white },
  shortcuts: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  shortcut: { flex: 1 },
  list: { paddingBottom: 92 },
  emptyList: { flexGrow: 1, paddingBottom: 92 },
  fileCard: {
    minHeight: 72,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  fileCardPressed: { backgroundColor: colors.surfaceMuted },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  fileContent: { flex: 1, minWidth: 0 },
  fileName: { color: colors.text, fontWeight: "700" },
  fileMeta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  fileAuthor: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  floatingAction: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    minWidth: 154,
    shadowColor: "#00254D",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});

export default ObraDetailScreen;
