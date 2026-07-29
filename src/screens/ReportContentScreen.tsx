import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { reportContent } from "@services/reportsService";
import { toastError, toastSuccess } from "@utils/toast";

type Props = NativeStackScreenProps<RootStackParamList, "ReportContent">;

const ReportContentScreen = ({ route, navigation }: Props) => {
  const { targetType, targetId, title } = route.params;
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 10) {
      toastError("Descreva o problema", "Use pelo menos 10 caracteres para ajudar na análise.");
      return;
    }
    setSubmitting(true);
    try {
      await reportContent(targetType, targetId, reason);
      toastSuccess("Denúncia enviada", "Obrigado. O conteúdo será analisado.");
      navigation.goBack();
    } catch (error) {
      toastError("Não foi possível enviar a denúncia", (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Denunciar conteúdo</Text>
      <Text style={styles.target} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.description}>
        Explique por que este conteúdo é inadequado, ilegal ou viola seus direitos.
      </Text>
      <TextInput
        style={styles.input}
        value={reason}
        onChangeText={setReason}
        placeholder="Descreva o problema"
        multiline
        maxLength={1000}
        textAlignVertical="top"
        editable={!submitting}
      />
      <Text style={styles.counter}>{reason.length}/1000</Text>
      <TouchableOpacity
        style={[styles.button, submitting && styles.disabled]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enviar denúncia</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f7f8fa" },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  target: { fontSize: 16, fontWeight: "700", color: "#334155", marginTop: 8 },
  description: { color: "#64748b", lineHeight: 22, marginTop: 12, marginBottom: 16 },
  input: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  counter: { color: "#64748b", textAlign: "right", marginTop: 6, marginBottom: 14 },
  button: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: "#0C5BAA",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.6 },
});

export default ReportContentScreen;
