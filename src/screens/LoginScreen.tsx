import React, { useCallback, useState } from "react";
import {
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  View,
  Image,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@context/AuthContext";
import { toastError, toastInfo } from "@utils/toast";
import { RootStackParamList } from "@navigation/AppNavigator";
import logo from "../../assets/logo-obradocs.png";

const PRIMARY_COLOR = "#0C5BAA";

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail) || password.length < 6) {
      toastError("Dados invalidos", "Informe um e-mail valido e senha com pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    await signIn(trimmedEmail, password);
    setSubmitting(false);
  };

  const handleRegister = () => {
    if (!isRegister) {
      setIsRegister(true);
      toastInfo("Cadastro", "Preencha nome, e-mail e senha para criar conta.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail) || password.length < 6 || name.trim().length < 2) {
      toastError(
        "Dados invalidos",
        "Nome (min. 2 letras), e-mail valido e senha com pelo menos 6 caracteres.",
      );
      return;
    }
    setSubmitting(true);
    signUp(name.trim() || trimmedEmail, trimmedEmail, password).finally(() => setSubmitting(false));
  };

  const handleForgotPassword = () => navigation.navigate("ForgotPassword");

  useFocusEffect(
    useCallback(() => {
      // Garante retorno para modo login ao voltar de outras telas
      setIsRegister(false);
      setName("");
    }, []),
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
              {/* Ajuste para logo circular */}
              <Image source={logo} style={styles.logo} />
            </View>
            <Text style={styles.title}>Obradocs</Text>
            <Text style={styles.subtitle}>Documentos de obra, organizados.</Text>
          </View>

          <View style={styles.card}>
            {isRegister && (
              <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor="#5f708d"
                value={name}
                onChangeText={setName}
                editable={!submitting}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#5f708d"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#5f708d"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              disabled={submitting}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Ir para a tela de esqueci minha senha"
              accessible
            >
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.disabledPrimary]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Entrar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, submitting && styles.disabledSecondary]}
              onPress={handleRegister}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={PRIMARY_COLOR} />
              ) : (
                <Text style={styles.secondaryText}>
                  {isRegister ? "Confirmar cadastro" : "Criar conta"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PRIMARY_COLOR },
  container: { flex: 1, backgroundColor: PRIMARY_COLOR },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 24 },
  logoWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  logo: { width: 76, height: 76, resizeMode: "contain", borderRadius: 38 },
  title: { fontSize: 32, fontWeight: "800", color: "#fff", marginBottom: 4, letterSpacing: 0.3 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.9)", textAlign: "center" },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#00254d",
    shadowOpacity: 0.15,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d5deec",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: "#f7f9fd",
    color: "#0f172a",
    fontSize: 15,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryButton: {
    width: "100%",
    borderColor: PRIMARY_COLOR,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(12,91,170,0.08)",
  },
  secondaryText: { color: PRIMARY_COLOR, fontWeight: "700", fontSize: 15 },
  disabledPrimary: { opacity: 0.85 },
  disabledSecondary: { opacity: 0.65 },
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 2,
    minHeight: 44,
    justifyContent: "center",
  },
  forgotText: { color: PRIMARY_COLOR, fontSize: 13.5, fontWeight: "600" },
});

export default LoginScreen;
