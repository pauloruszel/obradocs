import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { ArquivoTipo } from "@models/models";
import { uploadArquivo } from "@services/arquivosService";
import { ApiError } from "@services/apiClient";
import { useAuth } from "@context/AuthContext";
import { toastError, toastSuccess, toastInfo } from "@utils/toast";
import { arquivoTipoLabel, formatFileName } from "@utils/display";

type Props = NativeStackScreenProps<RootStackParamList, "UploadArquivo">;

const tipos: ArquivoTipo[] = ["ORCAMENTO", "NOTA_FISCAL", "PROJETO", "FOTO"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const UploadArquivoScreen = ({ route, navigation }: Props) => {
  const { obraId } = route.params;
  const { user } = useAuth();
  const [tipo, setTipo] = useState<ArquivoTipo>("FOTO");
  const [file, setFile] = useState<{ uri: string; name: string; mime?: string; size?: number; } | null>(
    null
  );
  const [uploading, setUploading] = useState(false);

  const uploadLockRef = useRef(false);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg"],
      copyToCacheDirectory: true,
    });

    if ("canceled" in result && result.canceled) {
      return;
    }

    const doc: any = (result as any).assets?.[0] ?? result;

    if ((doc && doc.uri) || (result as any).type === "success") {
      if (typeof doc.size === "number" && doc.size > MAX_FILE_SIZE) {
        setFile(null);
        toastError("Arquivo muito grande", "O limite para envio é de 10 MB.");
        return;
      }
      setFile({
        uri: doc.uri,
        name: formatFileName(doc.name ?? "arquivo.pdf"),
        mime: doc.mimeType ?? undefined,
        size: doc.size ?? undefined,
      });
    } else {
      toastError("Falha ao selecionar", "Não foi possível obter o arquivo selecionado.");
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toastError("Permissão negada", "Autorize o acesso à câmera nas configurações.");
      return;
    }
    const photo = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      allowsEditing: false,
    });
    if (photo.assets && photo.assets.length > 0) {
      const asset = photo.assets[0];
      setFile({
        uri: asset.uri,
        name: `foto-${Date.now()}.jpg`,
        mime: "image/jpeg",
      });
    }
  };

  const handleUpload = async () => {

    if (uploadLockRef.current) {
      return;
    }

    uploadLockRef.current = true;

    try {
      if (!user || !file) {
        toastInfo("Selecione um arquivo");
        return;
      }
      if (typeof file.size === "number" && file.size > MAX_FILE_SIZE) {
        toastError("Arquivo muito grande", "O limite para envio é de 10 MB.");
        return;
      }

      const isPdf =
        file.name.toLowerCase().endsWith(".pdf") || file.mime === "application/pdf";
      const isJpeg =
        file.name.toLowerCase().endsWith(".jpg") ||
        file.name.toLowerCase().endsWith(".jpeg") ||
        file.mime === "image/jpeg";

      if (!isPdf && !isJpeg) {
        toastError("Formato inválido", "Selecione um arquivo PDF ou JPEG.");
        return;
      }

      setUploading(true);

      await uploadArquivo({
        obraId,
        tipo,
        uri: file.uri,
        nomeOriginal: file.name,
        contentType: isPdf ? "application/pdf" : "image/jpeg",
      });

      toastSuccess("Arquivo enviado", "O documento já está disponível na obra.");
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.message || "";
      if (e instanceof ApiError && e.status === 413) {
        toastError("Arquivo muito grande", "O limite para envio é de 10 MB.");
        return;
      }
      const offline =
        msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch");
      toastError(
        offline ? "Sem conexão" : "Não foi possível enviar",
        offline
          ? "Verifique a internet e tente novamente."
          : msg || "Tente novamente."
      );
    } finally {
      setUploading(false);
      uploadLockRef.current = false;
    }
  };

  const fileSize =
    typeof file?.size === "number"
      ? file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Categoria</Text>
      <Text style={styles.helper}>Escolha onde o arquivo será organizado.</Text>
      <View style={styles.categoryGrid}>
        {tipos.map((itemTipo) => (
          <TouchableOpacity
            key={itemTipo}
            style={[styles.chip, tipo === itemTipo && styles.chipActive]}
            onPress={() => setTipo(itemTipo)}
            disabled={uploading}
            accessibilityState={{ selected: tipo === itemTipo, disabled: uploading }}
          >
            <Text style={[styles.chipText, tipo === itemTipo && styles.chipTextActive]}>
              {arquivoTipoLabel[itemTipo]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Arquivo</Text>
      <Text style={styles.helper}>Formatos aceitos: PDF ou JPEG, até 10 MB.</Text>
      {file ? (
        <View style={styles.preview}>
          {file.mime === "image/jpeg" && (
            <Image source={{ uri: file.uri }} style={styles.previewImage} />
          )}
          <View style={styles.previewInfo}>
            <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>
            <Text style={styles.fileMeta}>
              {[file.mime === "application/pdf" ? "PDF" : "JPEG", fileSize].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setFile(null)}
            disabled={uploading}
            style={styles.removeFileButton}
          >
            <Text style={styles.removeFileText}>Remover</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyFile}>
          <Text style={styles.emptyFileTitle}>Nenhum arquivo selecionado</Text>
          <Text style={styles.emptyFileText}>Escolha um documento ou tire uma foto.</Text>
        </View>
      )}

      <View style={styles.sourceActions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={pickDocument}
          disabled={uploading}
        >
          <Text style={styles.secondaryText}>{file ? "Substituir arquivo" : "Selecionar arquivo"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={takePhoto}
          disabled={uploading}
        >
          <Text style={styles.secondaryText}>Tirar foto</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (!file || uploading) && styles.buttonDisabled]}
        onPress={handleUpload}
        disabled={!file || uploading}
        accessibilityState={{ disabled: !file || uploading }}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Enviar arquivo</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  content: { padding: 16, paddingBottom: 28 },
  sectionTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700", marginTop: 4 },
  helper: { color: "#64748b", marginTop: 4, marginBottom: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#0C5BAA", borderColor: "#0C5BAA" },
  chipText: { color: "#374151", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  primaryButton: {
    backgroundColor: "#0C5BAA",
    minHeight: 48,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.45 },
  primaryText: { color: "#fff", fontWeight: "700" },
  sourceActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#0C5BAA",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#0C5BAA", fontWeight: "700", textAlign: "center" },
  preview: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    flexDirection: "row",
    alignItems: "center",
  },
  previewImage: { width: 52, height: 52, borderRadius: 6, resizeMode: "cover", marginRight: 10 },
  previewInfo: { flex: 1, minWidth: 0 },
  fileName: { color: "#0f172a", fontWeight: "700" },
  fileMeta: { color: "#64748b", fontSize: 13, marginTop: 3 },
  removeFileButton: { minHeight: 44, justifyContent: "center", paddingLeft: 10 },
  removeFileText: { color: "#be123c", fontSize: 13, fontWeight: "700" },
  emptyFile: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  emptyFileTitle: { color: "#334155", fontWeight: "700", textAlign: "center" },
  emptyFileText: { color: "#64748b", marginTop: 4, textAlign: "center" },
});

export default UploadArquivoScreen;
