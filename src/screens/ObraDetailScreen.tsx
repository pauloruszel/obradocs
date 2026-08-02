import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BadgeCheck,
  Camera,
  Clock3,
  Download,
  FileText,
  History,
  KeyRound,
  MoreVertical,
  Pencil,
  ReceiptText,
  Settings2,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
} from "lucide-react-native";
import { RootStackParamList } from "@navigation/AppNavigator";
import { Arquivo, ArquivoTipo, CategoriaObra, Papel } from "@models/models";
import { gerarUrlTemporaria, listarArquivosPagina, listarRevisoes } from "@services/arquivosService";
import { listarCategorias } from "@services/categoriasService";
import { listarPermissoes } from "@services/permissoesService";
import { useAuth } from "@context/AuthContext";
import { toastError, toastSuccess } from "@utils/toast";
import { arquivoTipoLabel, formatDateTime, formatFileName, papelLabel } from "@utils/display";
import { executeDeleteObraFlow } from "@utils/deleteObraFlow";
import { selecionarRevisaoOficial } from "@utils/clientPortal";
import { renomearObra, excluirObra } from "@services/obrasService";
import RenameObraModal from "@components/RenameObraModal";
import ConfirmDialog from "@components/ConfirmDialog";
import ActionMenu, { ActionMenuItem } from "@components/ActionMenu";
import AppButton from "@components/AppButton";
import SearchField from "@components/SearchField";
import ScreenState from "@components/ScreenState";
import { colors, layout, radius, spacing } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "ObraDetail">;

const categoryIcon: Record<ArquivoTipo, React.ElementType> = {
  ORCAMENTO: ReceiptText,
  NOTA_FISCAL: FileText,
  PROJETO: FileText,
  FOTO: Camera,
};

const ObraDetailScreen = ({ route, navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { obraId, nome } = route.params;
  const { user } = useAuth();
  const [categorias, setCategorias] = useState<CategoriaObra[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [filesByCategory, setFilesByCategory] = useState<Record<string, Arquivo[]>>({});
  const [pendingByCategory, setPendingByCategory] = useState<Record<string, Arquivo[]>>({});
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ambienteFiltro, setAmbienteFiltro] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Arquivo[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [papel, setPapel] = useState<"OWNER" | "EDITOR" | "VIEWER">("VIEWER");
  const [obraNome, setObraNome] = useState(nome);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pageByCategory, setPageByCategory] = useState<Record<string, number>>({});
  const [hasMoreByCategory, setHasMoreByCategory] = useState<Record<string, boolean>>({});
  const [searchPage, setSearchPage] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const canEdit = papel === "OWNER" || papel === "EDITOR";
  const clientPortal = papel === "VIEWER";
  const selectedCategory = categorias.find((item) => item.id === selected) || null;
  const arquivos = selected ? filesByCategory[selected] || [] : [];
  const pendingFiles = selected ? pendingByCategory[selected] || [] : [];
  const searchActive = query.trim().length > 0;
  const ambientes = Array.from(
    new Set(arquivos.map((item) => item.ambiente?.trim()).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const displayedFiles = searchActive
    ? searchResults
    : ambienteFiltro
      ? arquivos.filter((item) => item.ambiente === ambienteFiltro)
      : arquivos;
  const categoriasPreenchidas = categorias.filter((item) => item.documentos > 0).length;
  const completude = categorias.length
    ? Math.round((categoriasPreenchidas / categorias.length) * 100)
    : 0;

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

  const loadPermission = useCallback(async (): Promise<Papel> => {
    if (!user) return "VIEWER";
    try {
      const permissions = await listarPermissoes(obraId);
      const current = permissions.find((item) => item.user_id === user.id);
      const role = current?.papel || "VIEWER";
      setPapel(role);
      return role;
    } catch (error) {
      const offline = /network|fetch/i.test((error as Error)?.message || "");
      toastError(
        offline ? "Sem conexão" : "Não foi possível carregar seu acesso",
        offline ? "Verifique sua internet." : "Tente novamente.",
      );
      return "VIEWER";
    }
  }, [obraId, user]);

  const loadCategories = useCallback(async () => {
    try {
      const result = await listarCategorias(obraId);
      setCategorias(result);
      const current =
        result.find((item) => item.id === selectedRef.current)
        || result.find((item) => item.tipo === "FOTO")
        || result[0]
        || null;
      selectedRef.current = current?.id || null;
      setSelected(current?.id || null);
      return result;
    } catch {
      toastError("Não foi possível carregar as categorias", "Tente novamente.");
      return [];
    }
  }, [obraId]);

  const resolveClientFiles = useCallback(async (items: Arquivo[]) =>
    (await Promise.all(items.map(async (item) => {
      if (item.oficial_aprovada) return item;
      if (item.revisao_aprovada == null) return null;
      return selecionarRevisaoOficial(item, await listarRevisoes(item.id));
    }))).filter((item): item is Arquivo => item != null), []);

  const loadFiles = useCallback(
    async (category: CategoriaObra, role: Papel, nextPage = 0) => {
      if (nextPage > 0) setLoadingMore(true);
      try {
        const response = await listarArquivosPagina(obraId, nextPage, undefined, undefined, category.id);
        const visible = role === "VIEWER" ? await resolveClientFiles(response.items) : response.items;
        setFilesByCategory((current) => ({
          ...current,
          [category.id]: nextPage === 0 ? visible : [...(current[category.id] || []), ...visible],
        }));
        setPendingByCategory((current) => ({
          ...current,
          [category.id]: role === "VIEWER" ? [
            ...(nextPage === 0 ? [] : current[category.id] || []),
            ...response.items.filter((item) => item.aprovacao_status === "PENDING"),
          ] : [],
        }));
        setPageByCategory((current) => ({ ...current, [category.id]: response.page }));
        setHasMoreByCategory((current) => ({ ...current, [category.id]: response.has_more }));
      } catch (error) {
        const offline = /network|fetch/i.test((error as Error)?.message || "");
        toastError(
          offline ? "Sem conexão" : "Não foi possível carregar os arquivos",
          offline ? "Verifique sua internet." : "Verifique seu acesso à obra.",
        );
      } finally {
        setLoadingCategory((current) => (current === category.id ? null : current));
        setLoadingMore(false);
      }
    },
    [obraId, resolveClientFiles],
  );

  useFocusEffect(
    useCallback(() => {
      loadPermission().then((role) => loadCategories().then((result) => {
        const category =
          result.find((item) => item.id === selectedRef.current)
          || result.find((item) => item.tipo === "FOTO")
          || result[0];
        if (category) {
          setLoadingCategory(category.id);
          loadFiles(category, role);
        }
      }));
    }, [loadCategories, loadFiles, loadPermission]),
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
        const response = await listarArquivosPagina(obraId, 0, undefined, term);
        const visible = clientPortal ? await resolveClientFiles(response.items) : response.items;
        if (active) {
          setSearchResults(visible);
          setSearchPage(response.page);
          setSearchHasMore(response.has_more);
        }
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
  }, [clientPortal, obraId, query, resolveClientFiles]);

  const selectCategory = (category: CategoriaObra) => {
    if (category.id === selected) return;
    setAmbienteFiltro(null);
    selectedRef.current = category.id;
    setSelected(category.id);
    if (filesByCategory[category.id] === undefined) {
      setLoadingCategory(category.id);
      loadFiles(category, papel);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (searchActive) {
      try {
        const [role, response] = await Promise.all([
          loadPermission(),
          listarArquivosPagina(obraId, 0, undefined, query),
        ]);
        setSearchResults(role === "VIEWER" ? await resolveClientFiles(response.items) : response.items);
        setSearchPage(response.page);
        setSearchHasMore(response.has_more);
      } catch {
        toastError("Não foi possível atualizar a busca", "Tente novamente.");
      }
    } else {
      const role = await loadPermission();
      await (selectedCategory ? loadFiles(selectedCategory, role) : loadCategories());
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

  const handleDelete = async () => {
    if (deleteLoading) return;

    setDeleteLoading(true);
    await executeDeleteObraFlow({
      deleteObra: () => excluirObra(obraId),
      onSuccess: () => {
        setDeleteVisible(false);
        toastSuccess("Obra excluída com sucesso");
        navigation.popToTop();
      },
      onError: () => {
        toastError("Não foi possível excluir a obra", "Tente novamente.");
      },
    });
    setDeleteLoading(false);
  };

  const menuItems: ActionMenuItem[] = (() => {
    const items: ActionMenuItem[] = [];
    if (canEdit) {
      items.push({
        label: "Renomear obra",
        icon: <Pencil size={20} color={colors.text} />,
        onPress: () => setRenameVisible(true),
      });
      items.push({
        label: "Organizar categorias",
        icon: <Settings2 size={20} color={colors.text} />,
        onPress: () => navigation.navigate("CategoriasObra", { obraId }),
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
    if (papel === "OWNER") {
      items.push({
        label: "Código de acesso",
        icon: <KeyRound size={20} color={colors.text} />,
        onPress: () => navigation.navigate("CodigoAcesso", { obraId, nome: obraNome }),
      });
      items.push({
        label: "Excluir obra",
        icon: <Trash2 size={20} color={colors.danger} />,
        onPress: () => setDeleteVisible(true),
        destructive: true,
      });
    }
    return items;
  })();

  const downloadFile = async (item: Arquivo) => {
    if (downloadingId) return;
    setDownloadingId(item.id);
    try {
      await Linking.openURL(await gerarUrlTemporaria(item.id));
    } catch {
      toastError("Não foi possível baixar o documento", "Tente novamente.");
    } finally {
      setDownloadingId(null);
    }
  };

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
            nome: item.documento_nome,
            tipo: item.tipo,
            papel,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Abrir documento ${formatFileName(item.documento_nome)}`}
      >
        <View style={styles.fileIcon}>
          <Icon size={21} color={colors.primary} />
        </View>
        <View style={styles.fileContent}>
          <Text style={styles.fileName} numberOfLines={2}>
            {formatFileName(item.documento_nome)}
          </Text>
          <Text style={styles.fileMeta}>
            {searchActive ? `${arquivoTipoLabel[item.tipo]} · ` : ""}
            R{item.revisao} · {size} · {formatDateTime(item.created_at)}
          </Text>
          {clientPortal && (
            <View style={styles.officialRow}>
              <BadgeCheck size={14} color={colors.success} />
              <Text style={styles.officialText}>Revisão oficial aprovada</Text>
            </View>
          )}
          {!!item.ambiente && (
            <Text style={styles.fileAuthor} numberOfLines={1}>
              Ambiente: {item.ambiente}
            </Text>
          )}
          {!!item.enviado_por_nome && (
            <Text style={styles.fileAuthor} numberOfLines={1}>
              Enviado por {item.enviado_por_nome}
            </Text>
          )}
        </View>
        {clientPortal && (
          <Pressable
            style={styles.downloadButton}
            onPress={(event) => {
              event.stopPropagation();
              downloadFile(item);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Baixar documento ${formatFileName(item.documento_nome)}`}
          >
            {downloadingId === item.id
              ? <ActivityIndicator color={colors.primary} />
              : <Download size={21} color={colors.primary} />}
          </Pressable>
        )}
      </Pressable>
    );
  };

  const categoryLoading =
    !searchActive &&
    selectedCategory != null &&
    loadingCategory === selectedCategory.id &&
    filesByCategory[selectedCategory.id] === undefined;

  const loadMore = async () => {
    if (loadingMore) return;
    if (searchActive && searchHasMore) {
      setLoadingMore(true);
      try {
        const response = await listarArquivosPagina(obraId, searchPage + 1, undefined, query);
        const visible = clientPortal ? await resolveClientFiles(response.items) : response.items;
        setSearchResults((current) => [...current, ...visible]);
        setSearchPage(response.page);
        setSearchHasMore(response.has_more);
      } finally {
        setLoadingMore(false);
      }
      return;
    }
    if (selectedCategory && hasMoreByCategory[selectedCategory.id]) {
      await loadFiles(selectedCategory, papel, (pageByCategory[selectedCategory.id] || 0) + 1);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <FlatList
          data={categoryLoading ? [] : displayedFiles}
          keyExtractor={(item) => item.id}
          renderItem={renderFile}
          onEndReached={() => loadMore().catch(() => undefined)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            categoryLoading || displayedFiles.length === 0 ? styles.emptyList : styles.list,
            { paddingBottom: 92 + insets.bottom },
          ]}
          ListHeaderComponent={
            <View>
              <View style={styles.summary}>
                <View style={styles.summaryText}>
                  <Text style={styles.obraTitle} numberOfLines={2}>{obraNome}</Text>
                  {clientPortal && <Text style={styles.portalLabel}>Portal do cliente</Text>}
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{clientPortal ? "Cliente" : papelLabel[papel]}</Text>
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
                  style={styles.categoriesScroll}
                  contentContainerStyle={styles.categories}
                >
                  {categorias.map((category) => {
                    const Icon = categoryIcon[category.tipo];
                    const active = selected === category.id;
                    return (
                      <Pressable
                        key={category.id}
                        style={[styles.category, active && styles.categoryActive]}
                        onPress={() => selectCategory(category)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                      >
                        <Icon size={17} color={active ? colors.white : colors.textMuted} />
                        <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                          {category.nome}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {!clientPortal && !searchActive && categorias.length > 0 && (
                <View style={styles.completeness}>
                  <View style={styles.completenessHeader}>
                    <Text style={styles.completenessTitle}>Documentação da obra</Text>
                    <Text style={styles.completenessValue}>{completude}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressValue, { width: `${completude}%` }]} />
                  </View>
                  <Text style={styles.completenessHint}>
                    {categoriasPreenchidas} de {categorias.length} categorias com documentos
                  </Text>
                </View>
              )}

              {!searchActive && ambientes.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.roomsScroll}
                  contentContainerStyle={styles.rooms}
                >
                  {[null, ...ambientes].map((ambiente) => {
                    const active = ambienteFiltro === ambiente;
                    return (
                      <Pressable
                        key={ambiente || "todos"}
                        style={[styles.room, active && styles.roomActive]}
                        onPress={() => setAmbienteFiltro(ambiente)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.roomText, active && styles.roomTextActive]}>
                          {ambiente || "Todos os ambientes"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {clientPortal && !searchActive && pendingFiles.length > 0 && (
                <View style={styles.pendingCard}>
                  <View style={styles.pendingHeader}>
                    <Clock3 size={18} color={colors.warning} />
                    <Text style={styles.pendingTitle}>Aguardando decisão</Text>
                    <Text style={styles.pendingCount}>{pendingFiles.length}</Text>
                  </View>
                  {pendingFiles.map((item) => (
                    <View key={item.id} style={styles.pendingItem}>
                      <Text style={styles.pendingName} numberOfLines={1}>
                        {formatFileName(item.documento_nome)} · R{item.revisao}
                      </Text>
                      <Text style={styles.pendingDescription}>
                        Em análise pelo responsável da obra.
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.shortcuts}>
                <AppButton
                  label={clientPortal ? "Histórico da obra" : "Histórico"}
                  variant="secondary"
                  icon={<History size={18} color={colors.primary} />}
                  onPress={() => navigation.navigate("Historico", { obraId, clientPortal })}
                  style={styles.shortcut}
                />
                {!clientPortal && (
                  <AppButton
                    label="Permissões"
                    variant="secondary"
                    icon={<Users size={18} color={colors.primary} />}
                    onPress={() =>
                      navigation.navigate("Permissoes", { obraId, isOwner: papel === "OWNER" })
                    }
                    style={styles.shortcut}
                  />
                )}
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            categoryLoading ? (
              <ScreenState
                loading
                title={
                  selectedCategory
                    ? `Carregando ${selectedCategory.nome.toLowerCase()}`
                    : "Carregando documentos"
                }
              />
            ) : searchActive && searching ? (
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
                title={clientPortal ? "Nenhum documento aprovado nesta categoria" : "Nenhum arquivo nesta categoria"}
                description={
                  canEdit
                    ? "Envie o primeiro documento para começar a organizar esta obra."
                    : "Assim que uma revisão for aprovada, ela ficará disponível aqui."
                }
              />
            )
          }
        />
      </View>

      {canEdit && (
        <AppButton
          label="Enviar arquivo"
          icon={<Upload size={19} color={colors.white} />}
          onPress={() =>
            navigation.navigate("UploadArquivo", {
              obraId,
              categoriaId: selectedCategory?.id,
              categoriaNome: selectedCategory?.nome,
              tipo: selectedCategory?.tipo,
            })
          }
          style={{ ...styles.floatingAction, bottom: spacing.lg + insets.bottom }}
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
      <ConfirmDialog
        visible={deleteVisible}
        title="Excluir obra permanentemente?"
        message="A obra e seus documentos deixarão de aparecer para todos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir obra"
        destructive
        loading={deleteLoading}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
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
  portalLabel: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
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
  categoriesScroll: { flexGrow: 0, flexShrink: 0, height: 80 },
  categories: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  category: {
    width: 148,
    height: 56,
    flexShrink: 0,
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
  completeness: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  completenessHeader: { flexDirection: "row", justifyContent: "space-between" },
  completenessTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  completenessValue: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  progressTrack: {
    height: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  progressValue: { height: "100%", backgroundColor: colors.primary },
  completenessHint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  roomsScroll: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: spacing.md },
  rooms: { alignItems: "center", gap: spacing.sm },
  room: {
    height: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  roomActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  roomText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  roomTextActive: { color: colors.primary },
  pendingCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pendingTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "800" },
  pendingCount: { color: colors.warning, fontSize: 13, fontWeight: "800" },
  pendingItem: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  pendingName: { color: colors.text, fontSize: 13, fontWeight: "700" },
  pendingDescription: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
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
  officialRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  officialText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  fileAuthor: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  downloadButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
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
