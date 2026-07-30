import React, { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { CheckCircle2, Copy, ExternalLink, Share2 } from "lucide-react-native";
import { criarObra } from "@services/obrasService";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { toastError, toastSuccess } from "@utils/toast";
import { isPlanLimitReached } from "@utils/upgradeConversion";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import UpgradeLimitDialog from "@components/UpgradeLimitDialog";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "NovaObra">;

type CreatedObra = { id: string; nome: string; codigo_compartilhamento: string };

const NovaObraScreen = ({ navigation }: Props) => {
  const [nome, setNome] = useState("");
  const [created, setCreated] = useState<CreatedObra | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleCreate = async () => {
    const trimmed = nome.trim();
    if (trimmed.length < 3) {
      setError("Use pelo menos 3 caracteres.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      setCreated(await criarObra(trimmed));
    } catch (requestError) {
      if (isPlanLimitReached(requestError)) {
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
      <View style={styles.screen}>
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
    <View style={styles.screen}>
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
          <AppButton label="Criar obra" onPress={handleCreate} loading={submitting} disabled={nome.trim().length < 3} />
        </View>
      </View>
      <UpgradeLimitDialog
        visible={showUpgrade}
        limit="PLAN_LIMIT_REACHED"
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          navigation.navigate("PlanoProfissional", { origem: "limite_obra" });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  content: { width: "100%", maxWidth: layout.maxContentWidth, padding: spacing.xl },
  title: { ...typography.screenTitle },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  form: { gap: spacing.xl, marginTop: spacing.xl },
  successContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  successTitle: { ...typography.screenTitle, marginTop: spacing.lg },
  successDescription: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: spacing.sm, maxWidth: 380 },
  codeCard: { width: "100%", maxWidth: 420, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.xl, marginVertical: spacing.xl, gap: spacing.md },
  codeLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "700", textAlign: "center" },
  code: { color: colors.primary, fontSize: 30, fontWeight: "800", textAlign: "center", letterSpacing: 2 },
  fullButton: { width: "100%", maxWidth: 420, marginBottom: spacing.sm },
});

export default NovaObraScreen;
