import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { Copy, RefreshCw, Share2 } from "lucide-react-native";
import { RootStackParamList } from "@navigation/AppNavigator";
import { Obra, Papel } from "@models/models";
import { configurarCodigoAcesso, fetchObra } from "@services/obrasService";
import AppButton from "@components/AppButton";
import ConfirmDialog from "@components/ConfirmDialog";
import ScreenState from "@components/ScreenState";
import { toastError, toastSuccess } from "@utils/toast";
import { formatDateTime } from "@utils/display";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "CodigoAcesso">;
type PapelCodigo = Exclude<Papel, "OWNER">;
type Validade = null | 7 | 30;

const CodigoAcessoScreen = ({ route }: Props) => {
  const { obraId, nome } = route.params;
  const [obra, setObra] = useState<Obra | null>(null);
  const [ativo, setAtivo] = useState(true);
  const [papel, setPapel] = useState<PapelCodigo>("VIEWER");
  const [validade, setValidade] = useState<Validade>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmarNovo, setConfirmarNovo] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const atual = await fetchObra(obraId);
      setObra(atual);
      setAtivo(atual.codigo_compartilhamento_ativo);
      setPapel(atual.codigo_compartilhamento_papel);
      if (!atual.codigo_compartilhamento_expira_em) {
        setValidade(null);
      } else {
        const dias = Math.ceil(
          (new Date(atual.codigo_compartilhamento_expira_em).getTime() - Date.now()) / 86_400_000,
        );
        setValidade(dias <= 7 ? 7 : 30);
      }
    } catch {
      toastError("Não foi possível carregar o código", "Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [obraId]);

  const salvar = async (regenerar = false) => {
    setSaving(true);
    try {
      const atualizado = await configurarCodigoAcesso(obraId, {
        ativo,
        papel,
        validadeDias: validade,
        regenerar,
      });
      setObra(atualizado);
      setConfirmarNovo(false);
      toastSuccess(regenerar ? "Novo código gerado" : "Acesso atualizado");
    } catch {
      toastError("Não foi possível atualizar o acesso", "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const copiar = async () => {
    if (!obra) return;
    await Clipboard.setStringAsync(obra.codigo_compartilhamento);
    toastSuccess("Código copiado");
  };

  const compartilhar = async () => {
    if (!obra) return;
    await Share.share({
      message: `Acesse a obra "${nome}" no Obradocs com o código ${obra.codigo_compartilhamento}.`,
    });
  };

  if (loading) return <ScreenState loading title="Carregando código de acesso" />;
  if (!obra) {
    return <ScreenState title="Código indisponível" actionLabel="Tentar novamente" onAction={carregar} />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.codeCard}>
          <Text style={styles.eyebrow}>CÓDIGO DA OBRA</Text>
          <Text style={styles.code}>{obra.codigo_compartilhamento}</Text>
          <Text style={styles.status}>
            {ativo
              ? obra.codigo_compartilhamento_expira_em
                ? `Válido até ${formatDateTime(obra.codigo_compartilhamento_expira_em)}`
                : "Ativo sem data de expiração"
              : "Código desativado"}
          </Text>
          <View style={styles.actions}>
            <AppButton label="Copiar" variant="secondary" icon={<Copy size={18} color={colors.primary} />} onPress={copiar} style={styles.action} />
            <AppButton label="Compartilhar" variant="secondary" icon={<Share2 size={18} color={colors.primary} />} onPress={compartilhar} style={styles.action} disabled={!ativo} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.sectionTitle}>Permitir entrada por código</Text>
              <Text style={styles.description}>Desative para impedir novos acessos imediatamente.</Text>
            </View>
            <Switch value={ativo} onValueChange={setAtivo} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        <OptionGroup
          title="Acesso concedido"
          description="Escolha o que novos participantes poderão fazer."
          options={[
            { value: "VIEWER", label: "Visualizador" },
            { value: "EDITOR", label: "Editor" },
          ]}
          selected={papel}
          onSelect={(value) => setPapel(value as PapelCodigo)}
        />

        <OptionGroup
          title="Validade"
          description="A validade começa novamente quando você salvar."
          options={[
            { value: "7", label: "7 dias" },
            { value: "30", label: "30 dias" },
            { value: "none", label: "Sem prazo" },
          ]}
          selected={validade === null ? "none" : String(validade)}
          onSelect={(value) => setValidade(value === "none" ? null : Number(value) as Validade)}
        />

        <AppButton label="Salvar configurações" onPress={() => salvar()} loading={saving} />
        <AppButton label="Gerar novo código" variant="danger" icon={<RefreshCw size={18} color={colors.danger} />} onPress={() => setConfirmarNovo(true)} disabled={saving} />
      </ScrollView>

      <ConfirmDialog
        visible={confirmarNovo}
        title="Gerar um novo código?"
        message="O código atual deixará de funcionar imediatamente. Quem já participa da obra manterá o acesso."
        confirmLabel="Gerar novo código"
        destructive
        loading={saving}
        onCancel={() => setConfirmarNovo(false)}
        onConfirm={() => salvar(true)}
      />
    </View>
  );
};

type OptionGroupProps = {
  title: string;
  description: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
};

const OptionGroup = ({ title, description, options, selected, onSelect }: OptionGroupProps) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    <View style={styles.options}>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    padding: layout.screenPadding,
    gap: spacing.md,
  },
  codeCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  code: { color: colors.text, fontSize: 30, fontWeight: "800" },
  status: typography.caption,
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1 },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  switchText: { flex: 1 },
  sectionTitle: typography.sectionTitle,
  description: typography.caption,
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  optionTextActive: { color: colors.primary },
});

export default CodigoAcessoScreen;
