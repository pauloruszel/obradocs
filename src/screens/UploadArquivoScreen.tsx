import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { ArquivoTipo, CategoriaObra } from "@models/models";
import { uploadArquivo, uploadRevisao } from "@services/arquivosService";
import { listarCategorias } from "@services/categoriasService";
import { ApiError } from "@services/apiClient";
import { useAuth } from "@context/AuthContext";
import { toastError, toastSuccess } from "@utils/toast";
import { getUpgradeLimitCode, UpgradeLimitCode } from "@utils/upgradeConversion";
import { arquivoTipoLabel, formatFileName } from "@utils/display";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import UpgradeLimitDialog from "@components/UpgradeLimitDialog";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "UploadArquivo">;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const typeIcon: Record<ArquivoTipo, React.ElementType> = {
  ORCAMENTO: ReceiptText,
  NOTA_FISCAL: FileText,
  PROJETO: FileText,
  FOTO: ImageIcon,
};

const UploadArquivoScreen = ({ route, navigation }: Props) => {
  const {
    obraId,
    arquivoId,
    documentoNome,
    contentType: revisionContentType,
    tipo: tipoInicial,
    categoriaId: categoriaIdInicial,
    categoriaNome,
    papel,
  } = route.params;
  const isRevision = !!arquivoId;
  const { user } = useAuth();
  const [tipo, setTipo] = useState<ArquivoTipo>(tipoInicial || "FOTO");
  const [categorias, setCategorias] = useState<CategoriaObra[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | undefined>(categoriaIdInicial);
  const [ambiente, setAmbiente] = useState("");
  const [file, setFile] = useState<{
    uri: string;
    name: string;
    mime?: string;
    size?: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [upgradeLimit, setUpgradeLimit] = useState<UpgradeLimitCode | null>(null);
  const uploadLockRef = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isRevision ? "Enviar nova revisão" : "Enviar arquivo" });
  }, [isRevision, navigation]);

  useEffect(() => {
    if (isRevision) return;
    let active = true;
    listarCategorias(obraId)
      .then((result) => {
        if (!active) return;
        setCategorias(result);
        const current =
          result.find((item) => item.id === categoriaIdInicial)
          || result.find((item) => item.tipo === (tipoInicial || "FOTO"))
          || result[0];
        if (current) {
          setCategoriaId(current.id);
          setTipo(current.tipo);
        }
      })
      .catch(() => {
        if (active) toastError("Não foi possível carregar as categorias", "Tente novamente.");
      });
    return () => {
      active = false;
    };
  }, [categoriaIdInicial, isRevision, obraId, tipoInicial]);

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
      type: revisionContentType || ["application/pdf", "image/jpeg"],
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
    if (!isRevision) {
      const selectedCategory = categorias.find((item) => item.id === categoriaId);
      const photoCategory =
        selectedCategory?.tipo === "FOTO"
          ? selectedCategory
          : categorias.find((item) => item.tipo === "FOTO");
      if (photoCategory) {
        setCategoriaId(photoCategory.id);
        setTipo(photoCategory.tipo);
      }
    }
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

      const contentType = isPdf ? "application/pdf" : "image/jpeg";
      if (arquivoId) {
        const revision = await uploadRevisao({
          arquivoId,
          uri: file.uri,
          nomeOriginal: file.name,
          contentType,
        });
        toastSuccess(`Revisão R${revision.revisao} enviada`, "A versão mais recente já está disponível.");
        navigation.replace("ArquivoView", {
          arquivoId: revision.id,
          obraId,
          path: revision.storage_path,
          nome: revision.documento_nome,
          tipo: revision.tipo,
          papel,
        });
        return;
      } else {
        await uploadArquivo({
          obraId,
          categoriaId,
          tipo,
          uri: file.uri,
          nomeOriginal: file.name,
          contentType,
          ambiente,
        });
        toastSuccess("Arquivo enviado", "O documento já está disponível na obra.");
      }
      navigation.goBack();
    } catch (error) {
      const limitCode = getUpgradeLimitCode(error);
      if (limitCode) {
        setUpgradeLimit(limitCode);
      } else if (error instanceof ApiError && error.status === 413) {
        toastError("Arquivo muito grande", "O limite para envio é de 10 MB.");
      } else {
        const message = (error as Error)?.message || "";
        const timedOut = error instanceof Error && error.name === "AbortError";
        if (timedOut) {
          toastError(
            "Envio demorou demais",
            "A foto continua selecionada. Verifique a conexão e tente novamente.",
          );
          return;
        }
        const networkError = /network|fetch/i.test(message);
        toastError(
          networkError ? "Sem conexão" : "Não foi possível enviar",
          networkError ? "Verifique sua internet." : message || "Tente novamente.",
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
        {isRevision ? (
          <View style={styles.revisionSummary}>
            <Text style={styles.sectionTitle}>Nova versão</Text>
            <Text style={styles.revisionName} numberOfLines={2}>
              {formatFileName(documentoNome || "Documento")}
            </Text>
            <Text style={styles.helper}>{categoriaNome || arquivoTipoLabel[tipo]}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Categoria</Text>
            <Text style={styles.helper}>Escolha onde o arquivo será organizado.</Text>
            <View style={styles.categoryGrid}>
              {categorias.map((categoria) => {
                const Icon = typeIcon[categoria.tipo];
                const active = categoriaId === categoria.id;
                return (
                  <Pressable
                    key={categoria.id}
                    style={({ pressed }) => [
                      styles.category,
                      active && styles.categoryActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      setCategoriaId(categoria.id);
                      setTipo(categoria.tipo);
                    }}
                    disabled={uploading}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled: uploading }}
                  >
                    <Icon size={21} color={active ? colors.white : colors.primary} />
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                      {categoria.nome}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <AppInput
              label="Ambiente (opcional)"
              value={ambiente}
              onChangeText={setAmbiente}
              placeholder="Ex.: Cozinha, suíte ou recepção"
              maxLength={80}
              editable={!uploading}
              autoCapitalize="words"
            />
          </>
        )}

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
          {revisionContentType !== "application/pdf" && (
            <AppButton
              label="Tirar foto"
              variant="secondary"
              icon={<Camera size={18} color={colors.primary} />}
              onPress={takePhoto}
              disabled={uploading}
              style={styles.sourceButton}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={isRevision ? "Enviar revisão" : "Enviar arquivo"}
          icon={<Upload size={19} color={colors.white} />}
          onPress={handleUpload}
          loading={uploading}
          disabled={!file}
        />
      </View>
      <UpgradeLimitDialog
        visible={upgradeLimit !== null}
        limit={upgradeLimit || "STORAGE_LIMIT_REACHED"}
        onClose={() => setUpgradeLimit(null)}
        onUpgrade={() => {
          setUpgradeLimit(null);
          navigation.navigate("PlanoProfissional", { origem: "limite_armazenamento" });
        }}
      />
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
  revisionSummary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  revisionName: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: spacing.sm },
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
