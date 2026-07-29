import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { MailCheck } from "lucide-react-native";
import { solicitarRedefinicaoSenha } from "@services/authService";
import { RootStackParamList } from "@navigation/AppNavigator";
import logo from "../../assets/logo-obradocs.png";
import { validateEmail } from "@utils/validation";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import { colors, radius, spacing } from "@theme/index";
import { toastError } from "@utils/toast";

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const validation = validateEmail(email);
    setError(validation);
    if (validation) return;

    setLoading(true);
    try {
      await solicitarRedefinicaoSenha(email.trim());
      setSent(true);
    } catch {
      toastError("Não foi possível enviar o link", "Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

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
            {sent ? (
              <View style={styles.success}>
                <View style={styles.successIcon}>
                  <MailCheck size={32} color={colors.success} />
                </View>
                <Text style={styles.title}>Verifique seu e-mail</Text>
                <Text style={styles.subtitle}>
                  Se houver uma conta associada a {email.trim()}, você receberá as instruções em
                  alguns minutos.
                </Text>
                <AppButton
                  label="Voltar ao login"
                  onPress={() => navigation.navigate("Login")}
                  style={styles.action}
                />
                <AppButton
                  label="Enviar novamente"
                  onPress={() => setSent(false)}
                  variant="ghost"
                />
              </View>
            ) : (
              <>
                <Text style={styles.title}>Redefinir senha</Text>
                <Text style={styles.subtitle}>
                  Informe o e-mail da sua conta para receber um link seguro de redefinição.
                </Text>
                <View style={styles.form}>
                  <AppInput
                    label="E-mail"
                    placeholder="voce@exemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (error) setError(validateEmail(value));
                    }}
                    error={error}
                    editable={!loading}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit}
                    autoFocus
                  />
                  <AppButton label="Enviar link" onPress={handleSubmit} loading={loading} />
                  <AppButton
                    label="Voltar ao login"
                    onPress={() => navigation.navigate("Login")}
                    variant="ghost"
                    disabled={loading}
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
  success: { alignItems: "center" },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  action: { alignSelf: "stretch", marginTop: spacing.xl },
});

export default ForgotPasswordScreen;
