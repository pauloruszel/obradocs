import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderOpen,
  Hammer,
  HardHat,
  Palette,
  Share2,
  Sparkles,
} from "lucide-react-native";
import { criarObra } from "@services/obrasService";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { toastError, toastSuccess } from "@utils/toast";
import { getUpgradeLimitCode, UpgradeLimitCode } from "@utils/upgradeConversion";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import UpgradeLimitDialog from "@components/UpgradeLimitDialog";
import { colors, layout, radius, spacing, typography } from "@theme/index";
import { ModeloCategoria, ObraTemplate } from "@models/models";
import { listarModelosCategoria } from "@services/modelosCategoriaService";

type Props = NativeStackScreenProps<RootStackParamList, "NovaObra">;

type CreatedObra = { id: string; nome: string; codigo_compartilhamento: string };

const templates: {
  codigo: ObraTemplate;
  nome: string;
  descricao: string;
  categorias: string;
  icon: React.ElementType;
}[] = [
  {
    codigo: "GERAL",
    nome: "Geral",
    descricao: "Organização essencial",
    categorias: "Orçamento, nota fiscal, projeto e foto",
    icon: FolderOpen,
  },
  {
    codigo: "ARQUITETURA",
    nome: "Arquitetura",
    descricao: "Do estudo à execução",
    categorias: "Projetos, referências, orçamentos e registros",
    icon: Building2,
  },
  {
    codigo: "INTERIORES",
    nome: "Design de interiores",
    descricao: "Conceito e especificações",
    categorias: "Conceito, layouts, especificações e execução",
    icon: Palette,
  },
  {
    codigo: "ENGENHARIA",
    nome: "Engenharia",
    descricao: "Documentação técnica",
    categorias: "Projetos, memórias, relatórios e registros",
    icon: HardHat,
  },
  {
    codigo: "REFORMA",
    nome: "Reforma",
    descricao: "Acompanhamento prático",
    categorias: "Antes, projeto, compras e durante a obra",
    icon: Hammer,
  },
];

const NovaObraScreen = ({ navigation }: Props) => {
  const [nome, setNome] = useState("");
  const [created, setCreated] = useState<CreatedObra | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeLimit, setUpgradeLimit] = useState<UpgradeLimitCode>("PLAN_LIMIT_REACHED");
  const [template, setTemplate] = useState<ObraTemplate>("GERAL");
  const [modelos, setModelos] = useState<ModeloCategoria[]>([]);
  const [modeloId, setModeloId] = useState<string | undefined>();

  useEffect(() => {
    listarModelosCategoria()
      .then(setModelos)
      .catch(() => setModelos([]));
  }, []);

  const handleCreate = async () => {
    const trimmed = nome.trim();
    if (trimmed.length < 3) {
      setError("Use pelo menos 3 caracteres.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      setCreated(await criarObra(trimmed, template, modeloId));
    } catch (requestError) {
      const limit = getUpgradeLimitCode(requestError);
      if (limit) {
        setUpgradeLimit(limit);
        setShowUpgrade(true);
      } else {
        toastError("Não foi possível criar a obra", (requestError as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!created) return;
    await Clipboard.setStringAsync(created.codigo_compartilhamento);
    toastSuccess("Código copiado");
  };

  const shareCode = async () => {
    if (!created) return;
    await Share.share({
      message: `Acesse a obra "${created.nome}" no Obradocs com o código ${created.codigo_compartilhamento}.`,
    });
  };

  if (created) {
    return (
      <View style={[styles.screen, styles.screenCentered]}>
        <View style={[styles.content, styles.successContent]}>
          <CheckCircle2 size={58} color={colors.success} />
          <Text style={styles.successTitle}>Obra criada</Text>
          <Text style={styles.successDescription}>
            Compartilhe este código com quem precisa acessar {created.nome}.
          </Text>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Código da obra</Text>
            <Text style={styles.code}>{created.codigo_compartilhamento}</Text>
            <AppButton label="Copiar código" variant="secondary" icon={<Copy size={18} color={colors.primary} />} onPress={copyCode} />
            <AppButton label="Compartilhar código" variant="ghost" icon={<Share2 size={18} color={colors.primary} />} onPress={shareCode} />
          </View>
          <AppButton
            label="Abrir obra"
            icon={<ExternalLink size={18} color={colors.white} />}
            onPress={() => navigation.replace("ObraDetail", { obraId: created.id, nome: created.nome })}
            style={styles.fullButton}
          />
          <AppButton label="Voltar para minhas obras" variant="ghost" onPress={() => navigation.navigate("ObrasList")} style={styles.fullButton} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={styles.title}>Dê um nome à obra</Text>
        <Text style={styles.description}>Use um nome fácil de reconhecer, como o endereço ou o tipo do serviço.</Text>
        <View style={styles.form}>
          <AppInput
            label="Nome da obra"
            value={nome}
            onChangeText={(value) => {
              setNome(value);
              if (error) setError("");
            }}
            placeholder="Ex.: Reforma da casa"
            error={error}
            maxLength={200}
            editable={!submitting}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            autoFocus
          />
          <View>
            <Text style={styles.templateTitle}>Como você quer organizar?</Text>
            <Text style={styles.templateHelper}>
              Escolha um modelo inicial. Você poderá renomear e reordenar as categorias depois.
            </Text>
            <View style={styles.templateGrid}>
              {templates.map((item) => {
                const active = template === item.codigo;
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.codigo}
                    style={({ pressed }) => [
                      styles.templateCard,
                      active && styles.templateCardActive,
                      pressed && styles.templateCardPressed,
                    ]}
                    onPress={() => {
                      setTemplate(item.codigo);
                      setModeloId(undefined);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.templateIcon, active && styles.templateIconActive]}>
                      <Icon size={21} color={active ? colors.white : colors.primary} />
                    </View>
                    <View style={styles.templateText}>
                      <Text style={styles.templateName}>{item.nome}</Text>
                      <Text style={styles.templateDescription}>{item.descricao}</Text>
                      <Text style={styles.templateCategories} numberOfLines={2}>
                        {item.categorias}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {modelos.length > 0 && (
              <>
                <Text style={styles.savedTemplatesTitle}>Meus modelos</Text>
                <View style={styles.templateGrid}>
                  {modelos.map((item) => {
                    const active = modeloId === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        style={({ pressed }) => [
                          styles.templateCard,
                          active && styles.templateCardActive,
                          pressed && styles.templateCardPressed,
                        ]}
                        onPress={() => setModeloId(item.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                      >
                        <View style={[styles.templateIcon, active && styles.templateIconActive]}>
                          <Sparkles size={21} color={active ? colors.white : colors.primary} />
                        </View>
                        <View style={styles.templateText}>
                          <Text style={styles.templateName}>{item.nome}</Text>
                          <Text style={styles.templateDescription}>
                            {item.categorias.length} categorias personalizadas
                          </Text>
                          <Text style={styles.templateCategories} numberOfLines={2}>
                            {item.categorias.map((categoria) => categoria.nome).join(", ")}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
          <AppButton label="Criar obra" onPress={handleCreate} loading={submitting} disabled={nome.trim().length < 3} />
        </View>
      </View>
      <UpgradeLimitDialog
        visible={showUpgrade}
        limit={upgradeLimit}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          navigation.navigate("PlanoProfissional", { origem: "limite_obra" });
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenCentered: { alignItems: "center" },
  scrollContent: { alignItems: "center", paddingBottom: spacing.xl },
  content: { width: "100%", maxWidth: layout.maxContentWidth, padding: spacing.xl },
  title: { ...typography.screenTitle },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  form: { gap: spacing.xl, marginTop: spacing.xl },
  templateTitle: { ...typography.sectionTitle },
  templateHelper: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  templateGrid: { gap: spacing.sm },
  savedTemplatesTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  templateCard: {
    minHeight: 84,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  templateCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  templateCardPressed: { opacity: 0.82 },
  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  templateIconActive: { backgroundColor: colors.primary },
  templateText: { flex: 1, minWidth: 0 },
  templateName: { color: colors.text, fontWeight: "800", fontSize: 15 },
  templateDescription: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  templateCategories: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: spacing.xs },
  successContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  successTitle: { ...typography.screenTitle, marginTop: spacing.lg },
  successDescription: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: spacing.sm, maxWidth: 380 },
  codeCard: { width: "100%", maxWidth: 420, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.xl, marginVertical: spacing.xl, gap: spacing.md },
  codeLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "700", textAlign: "center" },
  code: { color: colors.primary, fontSize: 30, fontWeight: "800", textAlign: "center", letterSpacing: 2 },
  fullButton: { width: "100%", maxWidth: 420, marginBottom: spacing.sm },
});

export default NovaObraScreen;
