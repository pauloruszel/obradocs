import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Check, CheckCircle2, Eye, EyeOff } from "lucide-react-native";
import { redefinirSenha } from "@services/authService";
import { RootStackParamList } from "@navigation/AppNavigator";
import { useAuth } from "@context/AuthContext";
import logo from "../../assets/logo-obradocs.png";
import { validateNewPassword } from "@utils/validation";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import { colors, radius, spacing } from "@theme/index";
import { toastError } from "@utils/toast";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

const ResetPasswordScreen = ({ route, navigation }: Props) => {
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  const requirements = [
    { label: "Pelo menos 8 caracteres", valid: password.length >= 8 },
    { label: "Uma letra maiúscula", valid: /[A-Z]/.test(password) },
    { label: "Uma letra minúscula", valid: /[a-z]/.test(password) },
    { label: "Um número", valid: /\d/.test(password) },
  ];

  const handleUpdatePassword = async () => {
    const validation = validateNewPassword(password);
    if (validation) {
      setError(validation);
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    const token = route.params?.token;
    if (!token) {
      toastError("Link inválido", "Solicite um novo link de redefinição.");
      navigation.replace("ForgotPassword");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await redefinirSenha(token, password);
      setUpdated(true);
    } catch (requestError) {
      setError((requestError as Error).message || "Não foi possível atualizar a senha.");
    } finally {
      setLoading(false);
    }
  };

  const accessory = (
    <Pressable
      style={styles.inputAction}
      onPress={() => setShowPassword((current) => !current)}
      accessibilityRole="button"
      accessibilityLabel={showPassword ? "Ocultar senhas" : "Mostrar senhas"}
    >
      {showPassword ? (
        <EyeOff size={20} color={colors.textMuted} />
      ) : (
        <Eye size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.brand}>
            <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors />
            <Text style={styles.brandName}>Obradocs</Text>
          </View>

          <View style={styles.card}>
            {updated ? (
              <View style={styles.success}>
                <CheckCircle2 size={58} color={colors.success} />
                <Text style={styles.title}>Senha atualizada</Text>
                <Text style={styles.subtitle}>
                  Sua nova senha já está ativa. Entre novamente para acessar suas obras.
                </Text>
                <AppButton
                  label="Ir para o login"
            onPress={() => signOut()}
                  style={styles.successAction}
                />
              </View>
            ) : (
              <>
                <Text style={styles.title}>Definir nova senha</Text>
                <Text style={styles.subtitle}>Crie uma senha segura para proteger seus documentos.</Text>
                <View style={styles.form}>
                  <AppInput
                    label="Nova senha"
                    placeholder="Crie uma senha"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (error) setError("");
                    }}
                    autoComplete="new-password"
                    rightAccessory={accessory}
                    editable={!loading}
                  />
                  <View style={styles.requirements}>
                    {requirements.map((item) => (
                      <View key={item.label} style={styles.requirement}>
                        <Check
                          size={15}
                          color={item.valid ? colors.success : colors.textMuted}
                          opacity={item.valid ? 1 : 0.45}
                        />
                        <Text style={[styles.requirementText, item.valid && styles.requirementValid]}>
                          {item.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <AppInput
                    label="Confirmar senha"
                    placeholder="Repita a nova senha"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      if (error) setError("");
                    }}
                    autoComplete="new-password"
                    rightAccessory={accessory}
                    error={error}
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={handleUpdatePassword}
                  />
                  <AppButton
                    label="Atualizar senha"
                    onPress={handleUpdatePassword}
                    loading={loading}
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  logo: { width: 42, height: 42, borderRadius: 21 },
  brandName: { color: colors.text, fontSize: 20, fontWeight: "800" },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", textAlign: "center" },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  form: { gap: spacing.lg, marginTop: spacing.xl },
  inputAction: { width: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  requirements: { gap: spacing.sm, marginTop: -spacing.sm },
  requirement: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  requirementText: { color: colors.textMuted, fontSize: 13 },
  requirementValid: { color: colors.success },
  success: { alignItems: "center", paddingVertical: spacing.md },
  successAction: { alignSelf: "stretch", marginTop: spacing.xl },
});

export default ResetPasswordScreen;
