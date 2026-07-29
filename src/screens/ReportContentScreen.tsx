import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { reportContent } from "@services/reportsService";
import { toastError, toastSuccess } from "@utils/toast";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "ReportContent">;

const ReportContentScreen = ({ route, navigation }: Props) => {
  const { targetType, targetId, title } = route.params;
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 10) {
      setError("Descreva o problema usando pelo menos 10 caracteres.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await reportContent(targetType, targetId, reason.trim());
      toastSuccess("Denúncia enviada", "Obrigado. O conteúdo será analisado.");
      navigation.goBack();
    } catch (requestError) {
      toastError("Não foi possível enviar a denúncia", (requestError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.content}>
        <View style={styles.intro}>
          <View style={styles.icon}>
            <ShieldAlert size={25} color={colors.warning} />
          </View>
          <View style={styles.introText}>
            <Text style={styles.title}>Conteúdo denunciado</Text>
            <Text style={styles.target} numberOfLines={2}>{title}</Text>
          </View>
        </View>
        <Text style={styles.description}>
          Explique por que este conteúdo é inadequado, ilegal ou viola seus direitos. A denúncia
          será analisada de forma confidencial.
        </Text>
        <AppInput
          label="Descrição do problema"
          value={reason}
          onChangeText={(value) => {
            setReason(value);
            if (error) setError("");
          }}
          placeholder="Conte o que aconteceu"
          multiline
          maxLength={1000}
          error={error}
          editable={!submitting}
          helper={`${reason.length}/1000 caracteres`}
        />
        <AppButton
          label="Enviar denúncia"
          onPress={submit}
          loading={submitting}
          disabled={reason.trim().length < 10}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    padding: spacing.xl,
  },
  intro: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  introText: { flex: 1, minWidth: 0 },
  title: { ...typography.sectionTitle },
  target: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  description: { color: colors.textMuted, lineHeight: 22, marginVertical: spacing.xl },
  button: { marginTop: spacing.xl },
});

export default ReportContentScreen;
