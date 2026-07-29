import React, { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  FileCheck2,
  FileText,
  ImageIcon,
  ReceiptText,
  Trash2,
  Upload,
} from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { ArquivoTipo } from "@models/models";
import { uploadArquivo } from "@services/arquivosService";
import { ApiError } from "@services/apiClient";
import { useAuth } from "@context/AuthContext";
import { toastError, toastSuccess } from "@utils/toast";
import { arquivoTipoLabel, formatFileName } from "@utils/display";
import AppButton from "@components/AppButton";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "UploadArquivo">;

const tipos: ArquivoTipo[] = ["ORCAMENTO", "NOTA_FISCAL", "PROJETO", "FOTO"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const typeIcon: Record<ArquivoTipo, React.ElementType> = {
  ORCAMENTO: ReceiptText,
  NOTA_FISCAL: FileText,
  PROJETO: FileText,
  FOTO: ImageIcon,
};

const UploadArquivoScreen = ({ route, navigation }: Props) => {
  const { obraId } = route.params;
  const { user } = useAuth();
  const [tipo, setTipo] = useState<ArquivoTipo>("FOTO");
  const [file, setFile] = useState<{
    uri: string;
    name: string;
    mime?: string;
    size?: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadLockRef = useRef(false);

  const validateSize = (size?: number) => {
    if (typeof size === "number" && size > MAX_FILE_SIZE) {
      setFile(null);
      toastError("Arquivo muito grande", "O limite para envio é de 10 MB.");
      return false;
    }
    return true;
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri || !validateSize(asset.size)) return;
    setFile({
      uri: asset.uri,
      name: formatFileName(asset.name || "arquivo.pdf"),
      mime: asset.mimeType || undefined,
      size: asset.size || undefined,
    });
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toastError("Acesso à câmera necessário", "Autorize o acesso nas configurações do aparelho.");
      return;
    }
    const photo = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    const asset = photo.assets?.[0];
    if (!asset) return;
    setFile({
      uri: asset.uri,
      name: `foto-${Date.now()}.jpg`,
      mime: "image/jpeg",
      size: asset.fileSize,
    });
    setTipo("FOTO");
  };

  const handleUpload = async () => {
    if (uploadLockRef.current || !user || !file) return;
    uploadLockRef.current = true;
    setUploading(true);
    try {
      if (!validateSize(file.size)) return;
      const lowerName = file.name.toLowerCase();
      const isPdf = lowerName.endsWith(".pdf") || file.mime === "application/pdf";
      const isJpeg =
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        file.mime === "image/jpeg";
      if (!isPdf && !isJpeg) {
        toastError("Formato não aceito", "Selecione um arquivo PDF ou JPEG.");
        return;
      }

      await uploadArquivo({
        obraId,
        tipo,
        uri: file.uri,
        nomeOriginal: file.name,
        contentType: isPdf ? "application/pdf" : "image/jpeg",
      });
      toastSuccess("Arquivo enviado", "O documento já está disponível na obra.");
      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiError && error.status === 413) {
        toastError("Arquivo muito grande", "O limite para envio é de 10 MB.");
      } else {
        const message = (error as Error)?.message || "";
        toastError(
          /network|fetch/i.test(message) ? "Sem conexão" : "Não foi possível enviar",
          /network|fetch/i.test(message) ? "Verifique sua internet." : message || "Tente novamente.",
        );
      }
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
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Categoria</Text>
        <Text style={styles.helper}>Escolha onde o arquivo será organizado.</Text>
        <View style={styles.categoryGrid}>
          {tipos.map((itemTipo) => {
            const Icon = typeIcon[itemTipo];
            const active = tipo === itemTipo;
            return (
              <Pressable
                key={itemTipo}
                style={({ pressed }) => [
                  styles.category,
                  active && styles.categoryActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => setTipo(itemTipo)}
                disabled={uploading}
                accessibilityRole="radio"
                accessibilityState={{ selected: active, disabled: uploading }}
              >
                <Icon size={21} color={active ? colors.white : colors.primary} />
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {arquivoTipoLabel[itemTipo]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Arquivo</Text>
        <Text style={styles.helper}>Formatos aceitos: PDF ou JPEG, até 10 MB.</Text>
        {file ? (
          <View style={styles.preview}>
            {file.mime === "image/jpeg" ? (
              <Image source={{ uri: file.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.fileIcon}>
                <FileCheck2 size={25} color={colors.primary} />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>
              <Text style={styles.fileMeta}>
                {[file.mime === "application/pdf" ? "PDF" : "JPEG", fileSize]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            <Pressable
              onPress={() => setFile(null)}
              disabled={uploading}
              style={styles.removeFile}
              accessibilityRole="button"
              accessibilityLabel="Remover arquivo selecionado"
            >
              <Trash2 size={21} color={colors.danger} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyFile}>
            <Upload size={34} color={colors.primary} />
            <Text style={styles.emptyFileTitle}>Selecione um arquivo</Text>
            <Text style={styles.emptyFileText}>Escolha um documento ou tire uma foto agora.</Text>
          </View>
        )}

        <View style={styles.sourceActions}>
          <AppButton
            label={file ? "Substituir" : "Selecionar arquivo"}
            variant="secondary"
            icon={<FileText size={18} color={colors.primary} />}
            onPress={pickDocument}
            disabled={uploading}
            style={styles.sourceButton}
          />
          <AppButton
            label="Tirar foto"
            variant="secondary"
            icon={<Camera size={18} color={colors.primary} />}
            onPress={takePhoto}
            disabled={uploading}
            style={styles.sourceButton}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label="Enviar arquivo"
          icon={<Upload size={19} color={colors.white} />}
          onPress={handleUpload}
          loading={uploading}
          disabled={!file}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionTitle: { ...typography.sectionTitle, marginTop: spacing.xs },
  helper: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  category: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.text, fontWeight: "700" },
  categoryTextActive: { color: colors.white },
  pressed: { opacity: 0.78 },
  preview: {
    minHeight: 76,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  previewImage: { width: 52, height: 52, borderRadius: radius.sm, resizeMode: "cover", marginRight: spacing.md },
  fileIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  previewInfo: { flex: 1, minWidth: 0 },
  fileName: { color: colors.text, fontWeight: "700" },
  fileMeta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  removeFile: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  emptyFile: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  emptyFileTitle: { color: colors.text, fontWeight: "700", marginTop: spacing.md },
  emptyFileText: { color: colors.textMuted, marginTop: spacing.xs, textAlign: "center" },
  sourceActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  sourceButton: { flex: 1 },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
});

export default UploadArquivoScreen;
