import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
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

  // 🔒 trava de reentrância (não dispara o upload 2x)
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
        toastError("Arquivo muito grande", "O limite para envio e de 10 MB.");
        return;
      }
      setFile({
        uri: doc.uri,
        name: doc.name ?? "arquivo.pdf",
        mime: doc.mimeType ?? undefined,
        size: doc.size ?? undefined,
      });
    } else {
      toastError("Falha ao selecionar", "Nao foi possivel obter o arquivo selecionado.");
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toastError("Permissao negada", "Autorize o acesso a camera nas configuracoes.");
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
    console.log("handleUpload chamado. uploading =", uploading, "lock =", uploadLockRef.current);

    // 🔒 evita reentrância sincrona
    if (uploadLockRef.current) {
      console.log("Clique ignorado: upload já em andamento (lock).");
      return;
    }

    uploadLockRef.current = true;
    console.log("Iniciando uploadArquivo...");

    try {
      if (!user || !file) {
        toastInfo("Selecione um arquivo");
        return;
      }
      if (typeof file.size === "number" && file.size > MAX_FILE_SIZE) {
        toastError("Arquivo muito grande", "O limite para envio e de 10 MB.");
        return;
      }

      const isPdf =
        file.name.toLowerCase().endsWith(".pdf") || file.mime === "application/pdf";
      const isJpeg =
        file.name.toLowerCase().endsWith(".jpg") ||
        file.name.toLowerCase().endsWith(".jpeg") ||
        file.mime === "image/jpeg";

      if (!isPdf && !isJpeg) {
        toastError("Formato invalido", "Use PDF ou JPEG.");
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

      toastSuccess("Sucesso", "Arquivo enviado.");
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.message || "";
      if (e instanceof ApiError && e.status === 413) {
        toastError("Arquivo muito grande", "O limite para envio e de 10 MB.");
        return;
      }
      const offline =
        msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch");
      toastError(
        offline ? "Sem conexao" : "Erro",
        offline
          ? "Verifique a internet e tente novamente."
          : msg || "Nao foi possivel enviar."
      );
    } finally {
      setUploading(false);
      uploadLockRef.current = false;
      console.log("Finalizando upload, liberando lock.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tipo</Text>
      <View style={styles.row}>
        {tipos.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, tipo === t && styles.chipActive]}
            onPress={() => setTipo(t)}
            disabled={uploading}
          >
            <Text style={[styles.chipText, tipo === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Arquivo</Text>
      {file ? (
        <View style={styles.preview}>
          <Text>{file.name}</Text>
          {file.mime === "image/jpeg" && (
            <Image source={{ uri: file.uri }} style={{ width: 160, height: 120 }} />
          )}
        </View>
      ) : (
        <Text style={{ color: "#6b7280", marginBottom: 8 }}>
          Selecione um PDF ou JPEG.
        </Text>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={pickDocument}
        disabled={uploading}
      >
        <Text style={styles.secondaryText}>Selecionar arquivo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={takePhoto}
        disabled={uploading}
      >
        <Text style={styles.secondaryText}>Tirar foto</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleUpload}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Enviar</Text>
        )}
      </TouchableOpacity>

      <TextInput
        editable={false}
        style={styles.note}
        value="A conversao para PDF e opcional; fotos sao enviadas como JPEG."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa", padding: 16 },
  label: { fontWeight: "600", marginTop: 8, marginBottom: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d0d4d9",
    marginBottom: 8,
  },
  chipActive: { backgroundColor: "#0C5BAA", borderColor: "#0C5BAA" },
  chipText: { color: "#374151", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  primaryButton: {
    backgroundColor: "#0C5BAA",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#0C5BAA",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#0C5BAA", fontWeight: "600" },
  preview: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  note: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: "#fff",
  },
});

export default UploadArquivoScreen;
