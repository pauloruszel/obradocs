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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { showMessage } from "react-native-flash-message";
import { redefinirSenha } from "@services/authService";
import { RootStackParamList } from "@navigation/AppNavigator";
import { useAuth } from "@context/AuthContext";
import logo from "../../assets/logo-obradocs.png";

const PRIMARY_COLOR = "#0C5BAA";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

const ResetPasswordScreen = ({ route, navigation }: Props) => {
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const validatePassword = (value: string) => {
    if (value.length < 8) {
      return "Use pelo menos 8 caracteres.";
    }
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
      return "Inclua maiuscula, minuscula e numero.";
    }
    return "";
  };

  const handleChangePassword = (value: string) => {
    setPassword(value);
    const validation = validatePassword(value);
    const mismatch = confirmPassword && value !== confirmPassword ? "Senhas diferentes." : "";
    setError(validation || mismatch);
  };

  const handleChangeConfirm = (value: string) => {
    setConfirmPassword(value);
    if (password) {
      setError(value === password ? "" : "Senhas diferentes.");
    }
  };

  const handleUpdatePassword = async () => {
    const validation = validatePassword(password);
    if (validation) {
      setError(validation);
      showMessage({ type: "danger", message: validation });
      return;
    }
    if (password !== confirmPassword) {
      const mismatch = "Senhas diferentes.";
      setError(mismatch);
      showMessage({ type: "danger", message: mismatch });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const token = route.params?.token;
      if (!token) {
        showMessage({
          type: "danger",
          message: "Link de redefinicao invalido. Solicite um novo link.",
        });
        navigation.navigate("ForgotPassword");
        return;
      }

      await redefinirSenha(token, password);

      showMessage({ type: "success", message: "Senha redefinida com sucesso!" });
      timeoutRef.current = setTimeout(async () => {
        await signOut();
        if (!user) {
          navigation.navigate("Login");
        }
      }, 1200);
    } catch (error) {
      showMessage({
        type: "danger",
        message: (error as Error).message || "Falha de rede ao atualizar a senha.",
      });
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.goBack();

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
            <Text style={styles.title}>Definir nova senha</Text>
            <Text style={styles.subtitle}>
              Crie uma senha forte com pelo menos 8 caracteres, maiusculas, minusculas e numeros.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nova senha</Text>
            <TextInput
              style={[styles.input, !!error && styles.inputError]}
              placeholder="********"
              placeholderTextColor="#7a869a"
              secureTextEntry
              value={password}
              onChangeText={handleChangePassword}
              editable={!loading}
              returnKeyType="next"
              autoFocus
              accessible
              accessibilityLabel="Informe a nova senha"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Confirmar senha</Text>
            <TextInput
              style={[styles.input, !!error && styles.inputError]}
              placeholder="Repita a nova senha"
              placeholderTextColor="#7a869a"
              secureTextEntry
              value={confirmPassword}
              onChangeText={handleChangeConfirm}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleUpdatePassword}
              accessible
              accessibilityLabel="Confirme a nova senha"
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleUpdatePassword}
              disabled={loading}
              activeOpacity={0.9}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Atualizar senha"
              accessible
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Atualizar senha</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={goBack}
              activeOpacity={0.85}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Voltar para a tela anterior"
              accessible
            >
              <Text style={styles.secondaryText}>Voltar</Text>
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
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
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
  errorText: { color: "#b91c1c", marginTop: 10, fontSize: 13 },
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

export default ResetPasswordScreen;
