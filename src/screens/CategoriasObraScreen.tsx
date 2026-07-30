import React, { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Camera,
  FileText,
  Pencil,
  Plus,
  ReceiptText,
} from "lucide-react-native";
import { RootStackParamList } from "@navigation/AppNavigator";
import { ArquivoTipo, CategoriaObra } from "@models/models";
import {
  adicionarCategoria,
  atualizarCategoria,
  listarCategorias,
} from "@services/categoriasService";
import { consultarMinhaAssinatura } from "@services/planoService";
import { salvarModeloCategoria } from "@services/modelosCategoriaService";
import { getUpgradeLimitCode, UpgradeLimitCode } from "@utils/upgradeConversion";
import { toastError, toastSuccess } from "@utils/toast";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import ScreenState from "@components/ScreenState";
import UpgradeLimitDialog from "@components/UpgradeLimitDialog";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "CategoriasObra">;

const tipos: ArquivoTipo[] = ["ORCAMENTO", "NOTA_FISCAL", "PROJETO", "FOTO"];
const tipoLabel: Record<ArquivoTipo, string> = {
  ORCAMENTO: "Orçamento",
  NOTA_FISCAL: "Nota fiscal",
  PROJETO: "Documento",
  FOTO: "Imagem",
};
const tipoIcon: Record<ArquivoTipo, React.ElementType> = {
  ORCAMENTO: ReceiptText,
  NOTA_FISCAL: FileText,
  PROJETO: FileText,
  FOTO: Camera,
};

const CategoriasObraScreen = ({ route, navigation }: Props) => {
  const { obraId } = route.params;
  const [categorias, setCategorias] = useState<CategoriaObra[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CategoriaObra | null>(null);
  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<ArquivoTipo>("PROJETO");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeLimit, setUpgradeLimit] = useState<UpgradeLimitCode>("CATEGORY_LIMIT_REACHED");
  const [templateVisible, setTemplateVisible] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryResult, subscription] = await Promise.all([
        listarCategorias(obraId),
        consultarMinhaAssinatura(),
      ]);
      setCategorias(categoryResult);
      setIsPro(subscription.plano.codigo === "PRO");
    } catch {
      toastError("Não foi possível carregar as categorias", "Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [obraId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const openRename = (categoria: CategoriaObra) => {
    setEditing(categoria);
    setNome(categoria.nome);
  };

  const openAdd = () => {
    if (!isPro) {
      setUpgradeLimit("CATEGORY_LIMIT_REACHED");
      setShowUpgrade(true);
      return;
    }
    setNome("");
    setTipo("PROJETO");
    setAdding(true);
  };

  const openTemplate = () => {
    if (!isPro) {
      setUpgradeLimit("CUSTOM_TEMPLATE_REQUIRES_PRO");
      setShowUpgrade(true);
      return;
    }
    setTemplateName("");
    setTemplateVisible(true);
  };

  const saveTemplate = async () => {
    if (templateName.trim().length < 2) return;
    setSavingTemplate(true);
    try {
      await salvarModeloCategoria(templateName, categorias);
      setTemplateVisible(false);
      setTemplateName("");
      toastSuccess("Modelo salvo", "Ele já pode ser usado em uma nova obra.");
    } catch (error) {
      const limit = getUpgradeLimitCode(error);
      if (limit) {
        setTemplateVisible(false);
        setUpgradeLimit(limit);
        setShowUpgrade(true);
      } else {
        toastError("Não foi possível salvar o modelo", (error as Error).message);
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  const closeEditor = () => {
    if (saving) return;
    setEditing(null);
    setAdding(false);
    setNome("");
  };

  const save = async () => {
    const trimmed = nome.trim();
    if (trimmed.length < 2) {
      toastError("Nome muito curto", "Use pelo menos 2 caracteres.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await atualizarCategoria(obraId, editing.id, { nome: trimmed });
        toastSuccess("Categoria renomeada");
      } else {
        await adicionarCategoria(obraId, trimmed, tipo);
        toastSuccess("Categoria adicionada");
      }
      setEditing(null);
      setAdding(false);
      setNome("");
      await load();
    } catch (error) {
      if (getUpgradeLimitCode(error) === "CATEGORY_LIMIT_REACHED") {
        setEditing(null);
        setAdding(false);
        setShowUpgrade(true);
      } else {
        toastError("Não foi possível salvar a categoria", (error as Error).message);
      }
    } finally {
      setSaving(false);
    }
  };

  const move = async (categoria: CategoriaObra, direction: -1 | 1) => {
    const ordem = categoria.ordem + direction;
    if (ordem < 0 || ordem >= categorias.length) return;
    setSaving(true);
    try {
      await atualizarCategoria(obraId, categoria.id, { ordem });
      await load();
    } catch {
      toastError("Não foi possível reordenar", "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && categorias.length === 0) {
    return <ScreenState loading title="Carregando categorias" />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Organização da obra</Text>
        <Text style={styles.description}>
          Ajuste os nomes e a ordem sem alterar os documentos que já foram enviados.
        </Text>

        <View style={styles.list}>
          {categorias.map((categoria, index) => {
            const Icon = tipoIcon[categoria.tipo];
            return (
              <View key={categoria.id} style={styles.row}>
                <View style={styles.icon}>
                  <Icon size={20} color={colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>{categoria.nome}</Text>
                  <Text style={styles.kind}>{tipoLabel[categoria.tipo]}</Text>
                </View>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => move(categoria, -1)}
                  disabled={saving || index === 0}
                  accessibilityRole="button"
                  accessibilityLabel={`Mover ${categoria.nome} para cima`}
                >
                  <ArrowUp size={20} color={index === 0 ? colors.borderStrong : colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => move(categoria, 1)}
                  disabled={saving || index === categorias.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel={`Mover ${categoria.nome} para baixo`}
                >
                  <ArrowDown
                    size={20}
                    color={index === categorias.length - 1 ? colors.borderStrong : colors.primary}
                  />
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => openRename(categoria)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={`Renomear ${categoria.nome}`}
                >
                  <Pencil size={19} color={colors.primary} />
                </Pressable>
              </View>
            );
          })}
        </View>

        <AppButton
          label={isPro ? "Adicionar categoria" : "Adicionar categoria no Profissional"}
          variant={isPro ? "secondary" : "primary"}
          icon={<Plus size={19} color={isPro ? colors.primary : colors.white} />}
          onPress={openAdd}
        />
        <AppButton
          label={isPro ? "Salvar como modelo" : "Salvar modelo no Profissional"}
          variant="secondary"
          icon={<BookmarkPlus size={19} color={colors.primary} />}
          onPress={openTemplate}
          style={styles.templateButton}
        />
        {!isPro && (
          <Text style={styles.planNote}>
            O plano gratuito inclui as quatro categorias do modelo escolhido. Renomear e
            reordenar continuam disponíveis.
          </Text>
        )}
      </ScrollView>

      <Modal visible={!!editing || adding} transparent animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editing ? "Renomear categoria" : "Nova categoria"}
            </Text>
            <AppInput
              label="Nome"
              value={nome}
              onChangeText={setNome}
              placeholder="Ex.: Mobiliário"
              maxLength={80}
              autoFocus
              editable={!saving}
            />
            {adding && (
              <View>
                <Text style={styles.typeTitle}>Identificação visual</Text>
                <View style={styles.typeGrid}>
                  {tipos.map((item) => {
                    const Icon = tipoIcon[item];
                    const active = tipo === item;
                    return (
                      <Pressable
                        key={item}
                        style={[styles.typeOption, active && styles.typeOptionActive]}
                        onPress={() => setTipo(item)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                      >
                        <Icon size={18} color={active ? colors.white : colors.primary} />
                        <Text style={[styles.typeOptionText, active && styles.typeOptionTextActive]}>
                          {tipoLabel[item]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            <View style={styles.modalActions}>
              <AppButton label="Cancelar" variant="secondary" onPress={closeEditor} disabled={saving} style={styles.modalButton} />
              <AppButton label="Salvar" onPress={save} loading={saving} disabled={nome.trim().length < 2} style={styles.modalButton} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={templateVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !savingTemplate && setTemplateVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Salvar organização</Text>
            <Text style={styles.modalDescription}>
              As {categorias.length} categorias atuais poderão ser reutilizadas em outras obras.
            </Text>
            <AppInput
              label="Nome do modelo"
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Ex.: Interiores residencial"
              maxLength={80}
              autoFocus
              editable={!savingTemplate}
            />
            <View style={styles.modalActions}>
              <AppButton
                label="Cancelar"
                variant="secondary"
                onPress={() => setTemplateVisible(false)}
                disabled={savingTemplate}
                style={styles.modalButton}
              />
              <AppButton
                label="Salvar modelo"
                onPress={saveTemplate}
                loading={savingTemplate}
                disabled={templateName.trim().length < 2}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      <UpgradeLimitDialog
        visible={showUpgrade}
        limit={upgradeLimit}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          navigation.navigate("PlanoProfissional", { origem: "limite_categoria" });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center", padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.screenTitle },
  description: { color: colors.textMuted, lineHeight: 21, marginTop: spacing.xs, marginBottom: spacing.xl },
  list: { gap: spacing.sm, marginBottom: spacing.lg },
  row: { minHeight: 72, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primarySoft, marginRight: spacing.md },
  rowText: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontWeight: "700", fontSize: 15 },
  kind: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  iconButton: { width: 42, height: 48, alignItems: "center", justifyContent: "center" },
  planNote: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: "center", marginTop: spacing.md },
  templateButton: { marginTop: spacing.sm },
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  modal: { width: "100%", maxWidth: 440, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xl, gap: spacing.lg },
  modalTitle: { ...typography.screenTitle, fontSize: 21 },
  modalDescription: { color: colors.textMuted, lineHeight: 20 },
  typeTitle: { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: spacing.sm },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeOption: { flexBasis: "47%", flexGrow: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md },
  typeOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeOptionText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  typeOptionTextActive: { color: colors.white },
  modalActions: { flexDirection: "row", gap: spacing.sm },
  modalButton: { flex: 1 },
});

export default CategoriasObraScreen;
