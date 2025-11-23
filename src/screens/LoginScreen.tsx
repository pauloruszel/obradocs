import React, { useState } from "react";
import {
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@context/AuthContext";
import { toastError, toastInfo } from "@utils/toast";

const LoginScreen = () => {
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <Text style={styles.title}>Obradocs</Text>
      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder="Nome"
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!submitting}
      />
      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.disabledPrimary]}
        onPress={handleLogin}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Entrar</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryButton, submitting && styles.disabledSecondary]}
        onPress={handleRegister}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#0C5BAA" />
        ) : (
          <Text style={styles.secondaryText}>{isRegister ? "Confirmar cadastro" : "Criar conta"}</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#f7f8fa" },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 24, color: "#0C5BAA" },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d0d4d9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#0C5BAA",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryText: { color: "#fff", fontWeight: "600" },
  secondaryButton: {
    width: "100%",
    borderColor: "#0C5BAA",
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#0C5BAA", fontWeight: "600" },
  disabledPrimary: { opacity: 0.8 },
  disabledSecondary: { opacity: 0.6 },
});

export default LoginScreen;
