import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { showMessage } from "react-native-flash-message";
import { supabase } from "@services/supabase";
import { RootStackParamList } from "@navigation/AppNavigator";
import logo from "../../assets/logo-obradocs.png";

const PRIMARY_COLOR = "#0C5BAA";

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const validateEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Informe seu e-mail.";
    }
    const regex = /\S+@\S+\.\S+/;
    if (!regex.test(trimmed)) {
      return "E-mail invalido.";
    }
    return "";
  };

  const handleChangeEmail = (value: string) => {
    setEmail(value);
    setError(validateEmail(value));
    if (infoMessage) {
      setInfoMessage("");
    }
  };

  const handleSubmit = async () => {
    const validation = validateEmail(email);
    setError(validation);
    if (validation) {
      showMessage({ type: "danger", message: validation });
      return;
    }

    setLoading(true);
    setInfoMessage("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "obradocs/reset",
      });

      if (resetError) {
        showMessage({
          type: "danger",
          message: "Nao foi possivel enviar agora. Verifique a conexao e tente novamente.",
        });
        return;
      }

      const confirmation =
        "Se houver uma conta associada a este e-mail, voce recebera as instrucoes em alguns minutos.";
      setInfoMessage(confirmation);
      showMessage({ type: "success", message: "Se o e-mail existir, enviaremos um link." });

      timeoutRef.current = setTimeout(() => {
        navigation.navigate("Login");
      }, 2500);
    } catch {
      showMessage({
        type: "danger",
        message: "Problema de rede. Tente novamente em instantes.",
      });
    } finally {
      setLoading(false);
    }
  };

  const goBackToLogin = () => navigation.navigate("Login");

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
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              {/* Ajuste para logo circular */}
              <Image
                source={logo}
                style={styles.logo}
                accessibilityIgnoresInvertColors
              />
            </View>
            <Text style={styles.title}>Redefinir senha</Text>
            <Text style={styles.subtitle}>Informe seu e-mail e enviaremos um link para redefinicao.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={[styles.input, !!error && styles.inputError]}
              placeholder="voce@exemplo.com"
              placeholderTextColor="#7a869a"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              value={email}
              onChangeText={handleChangeEmail}
              editable={!loading}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              accessible
              accessibilityLabel="Campo de e-mail para recuperar a senha"
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            {!!infoMessage && <Text style={styles.infoText}>{infoMessage}</Text>}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.9}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Enviar link de redefinicao"
              accessible
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Enviar link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={goBackToLogin}
              activeOpacity={0.85}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Voltar ao login"
              accessible
            >
              <Text style={styles.secondaryText}>Voltar ao login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 28 },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(12,91,170,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(12,91,170,0.12)",
    overflow: "hidden",
  },
  logo: { width: 60, height: 60, resizeMode: "contain", borderRadius: 30 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  subtitle: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 8 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#f9fafb",
  },
  inputError: { borderColor: "#ef4444", backgroundColor: "#fff1f2" },
  errorText: { color: "#b91c1c", marginTop: 6, fontSize: 13 },
  infoText: { color: "#0f172a", marginTop: 10, fontSize: 14, lineHeight: 20 },
  primaryButton: {
    marginTop: 18,
    width: "100%",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 48,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabledButton: { opacity: 0.8 },
  secondaryButton: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 12,
    minHeight: 44,
  },
  secondaryText: { color: PRIMARY_COLOR, fontWeight: "700", fontSize: 15 },
});

export default ForgotPasswordScreen;
