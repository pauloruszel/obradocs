import React, { useCallback, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Check, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "@context/AuthContext";
import { toastError } from "@utils/toast";
import { RootStackParamList } from "@navigation/AppNavigator";
import logo from "../../assets/logo-obradocs.png";
import { validateEmail, validateNewPassword } from "@utils/validation";
import { publicApiUrl } from "@services/apiClient";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import { colors, radius, spacing } from "@theme/index";

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (validateEmail(trimmedEmail) || password.length < 6) {
      toastError("Dados inválidos", "Informe um e-mail válido e sua senha.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(trimmedEmail, password);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const passwordError = validateNewPassword(password);
    if (validateEmail(trimmedEmail) || passwordError || name.trim().length < 2 || !acceptedTerms) {
      toastError(
        "Revise os dados",
        passwordError || "Informe nome, e-mail e aceite os documentos para continuar.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await signUp(name.trim(), trimmedEmail, password, acceptedTerms);
    } finally {
      setSubmitting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsRegister(false);
      setName("");
      setAcceptedTerms(false);
      setShowPassword(false);
    }, []),
  );

  const passwordAccessory = (
    <Pressable
      style={styles.inputAction}
      onPress={() => setShowPassword((current) => !current)}
      accessibilityRole="button"
      accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image
                source={logo}
                style={styles.logo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
            <Text style={styles.title}>Obradocs</Text>
            <Text style={styles.subtitle}>Documentos de obra, organizados.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.formTitle}>{isRegister ? "Criar sua conta" : "Acessar sua conta"}</Text>
            <Text style={styles.formSubtitle}>
              {isRegister
                ? "Cadastre seus dados para começar a organizar suas obras."
                : "Entre para acessar suas obras e documentos."}
            </Text>

            <View style={styles.fields}>
              {isRegister && (
                <AppInput
                  label="Nome"
                  placeholder="Como você quer ser chamado"
                  value={name}
                  onChangeText={setName}
                  editable={!submitting}
                  autoComplete="name"
                />
              )}
              <AppInput
                label="E-mail"
                placeholder="voce@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!submitting}
              />
              <AppInput
                label="Senha"
                placeholder={isRegister ? "Crie uma senha segura" : "Informe sua senha"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!submitting}
                autoComplete={isRegister ? "new-password" : "current-password"}
                helper={
                  isRegister
                    ? "Use 8 ou mais caracteres, com maiúscula, minúscula e número."
                    : undefined
                }
                rightAccessory={passwordAccessory}
                onSubmitEditing={isRegister ? handleRegister : handleLogin}
              />
            </View>

            {!isRegister && (
              <Pressable
                style={styles.forgotButton}
                onPress={() => navigation.navigate("ForgotPassword")}
                disabled={submitting}
                accessibilityRole="button"
              >
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </Pressable>
            )}

            {isRegister && (
              <>
                <Pressable
                  style={styles.termsRow}
                  onPress={() => setAcceptedTerms((current) => !current)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedTerms }}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                    {acceptedTerms && <Check size={17} color={colors.white} strokeWidth={3} />}
                  </View>
                  <Text style={styles.termsText}>Li e aceito os documentos abaixo.</Text>
                </Pressable>
                <View style={styles.legalLinks}>
                  <Pressable
                    onPress={() => Linking.openURL(publicApiUrl("/terms.html"))}
                    accessibilityRole="link"
                  >
                    <Text style={styles.legalLink}>Termos de Uso</Text>
                  </Pressable>
                  <Text style={styles.separator}>•</Text>
                  <Pressable
                    onPress={() => Linking.openURL(publicApiUrl("/privacy.html"))}
                    accessibilityRole="link"
                  >
                    <Text style={styles.legalLink}>Política de Privacidade</Text>
                  </Pressable>
                </View>
              </>
            )}

            <AppButton
              label={isRegister ? "Criar conta" : "Entrar"}
              onPress={isRegister ? handleRegister : handleLogin}
              loading={submitting}
              style={styles.primaryAction}
            />
            <AppButton
              label={isRegister ? "Já tenho uma conta" : "Criar conta"}
              onPress={() => {
                setIsRegister((current) => !current);
                setAcceptedTerms(false);
              }}
              variant="ghost"
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.primary },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: spacing.xl },
  logoWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  logo: { width: 70, height: 70, borderRadius: 35 },
  title: { fontSize: 32, fontWeight: "800", color: colors.white },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.88)", marginTop: spacing.xs },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    shadowColor: "#00254D",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  formTitle: { color: colors.text, fontSize: 21, fontWeight: "800" },
  formSubtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  fields: { gap: spacing.md, marginTop: spacing.xl },
  inputAction: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotButton: {
    alignSelf: "flex-end",
    minHeight: 48,
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  forgotText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { flex: 1, color: colors.text, fontSize: 14 },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  legalLink: { color: colors.primary, fontSize: 13, fontWeight: "700", paddingVertical: spacing.sm },
  separator: { color: colors.textMuted },
  primaryAction: { marginTop: spacing.md },
});

export default LoginScreen;
