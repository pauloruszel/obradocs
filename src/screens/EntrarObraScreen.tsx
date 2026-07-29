import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { KeyRound } from "lucide-react-native";
import { entrarPorCodigo } from "@services/obrasService";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { toastError, toastSuccess } from "@utils/toast";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import { colors, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "EntrarObra">;

const formatCode = (value: string) => {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return normalized.length > 4 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
};

const EntrarObraScreen = ({ navigation }: Props) => {
  const [codigo, setCodigo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEnter = async () => {
    if (codigo.length !== 9) return;
    setSubmitting(true);
    try {
      const obra = await entrarPorCodigo(codigo);
      toastSuccess("Acesso liberado", "Você já pode acessar os documentos desta obra.");
      navigation.replace("ObraDetail", { obraId: obra.id, nome: obra.nome });
    } catch (error) {
      toastError("Código não encontrado", (error as Error).message || "Confira o código e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <KeyRound size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>Entrar em uma obra</Text>
        <Text style={styles.description}>
          Digite o código de oito caracteres compartilhado pelo proprietário da obra.
        </Text>
        <View style={styles.form}>
          <AppInput
            label="Código da obra"
            placeholder="XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect={false}
            value={codigo}
            onChangeText={(value) => setCodigo(formatCode(value))}
            maxLength={9}
            editable={!submitting}
            returnKeyType="go"
            onSubmitEditing={handleEnter}
            style={styles.codeInput}
            autoFocus
          />
          <AppButton
            label="Entrar na obra"
            onPress={handleEnter}
            loading={submitting}
            disabled={codigo.length !== 9}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  content: { width: "100%", maxWidth: 520, padding: spacing.xl, alignItems: "center" },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  title: { ...typography.screenTitle, marginTop: spacing.lg, textAlign: "center" },
  description: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  form: { width: "100%", gap: spacing.xl, marginTop: spacing.xl },
  codeInput: { fontSize: 20, fontWeight: "700", letterSpacing: 2, textAlign: "center" },
});

export default EntrarObraScreen;
