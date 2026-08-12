import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  Building2,
  Camera,
  FileCheck2,
  FileText,
  ImageIcon,
  ReceiptText,
  Trash2,
  Upload,
  Plus,
} from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "@navigation/AppNavigator";
import { ArquivoTipo, CategoriaObra } from "@models/models";
import { listarAmbientes, uploadArquivo, uploadRevisao } from "@services/arquivosService";
import { listarCategorias } from "@services/categoriasService";
import { ApiError } from "@services/apiClient";
import { useAuth } from "@context/AuthContext";
import { toastError, toastSuccess } from "@utils/toast";
import { getUpgradeLimitCode, UpgradeLimitCode } from "@utils/upgradeConversion";
import { arquivoTipoLabel, formatFileName } from "@utils/display";
import {
  UPLOAD_FORMATS_DESCRIPTION,
  UploadFormat,
  uploadErrorFeedback,
  uploadFormatFor,
  uploadLimitLabel,
} from "@utils/uploadFormats";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import ConfirmDialog from "@components/ConfirmDialog";
import UpgradeLimitDialog from "@components/UpgradeLimitDialog";
import ObradocsUploadMotion from "@components/motion/ObradocsUploadMotion";
import { colors, layout, radius, spacing, typography } from "@theme/index";

type Props = NativeStackScreenProps<RootStackParamList, "UploadArquivo">;

const WHOLE_WORK = "__whole_work__";
const NEW_ENVIRONMENT = "__new_environment__";

const typeIcon: Record<ArquivoTipo, React.ElementType> = {
  ORCAMENTO: ReceiptText,
  NOTA_FISCAL: FileText,
  PROJETO: FileText,
  FOTO: ImageIcon,
};

const UploadArquivoScreen = ({ route, navigation }: Props) => {
  const insets = useSafeAreaInsets();
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
  const [ambientes, setAmbientes] = useState<string[]>([]);
  const [destino, setDestino] = useState<string | null>(null);
  const [novoAmbiente, setNovoAmbiente] = useState("");
  const [confirmWholeWork, setConfirmWholeWork] = useState(false);
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
    Promise.all([listarCategorias(obraId), listarAmbientes(obraId).catch(() => [])])
      .then(([result, existingEnvironments]) => {
        if (!active) return;
        setCategorias(result);
        setAmbientes(existingEnvironments);
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

  const validateFile = (name: string, size?: number): UploadFormat | undefined => {
    const format = uploadFormatFor(name);
    if (!format) {
      setFile(null);
      toastError("Formato não aceito", UPLOAD_FORMATS_DESCRIPTION);
      return undefined;
    }
    if (typeof size === "number" && size > format.maxBytes) {
      setFile(null);
      toastError("Arquivo muito grande", `O limite para ${format.label} é de ${uploadLimitLabel(format)}.`);
      return undefined;
    }
    return format;
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri || !validateFile(asset.name || "", asset.size)) return;
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

  const selectDroppedFile = (browserFile: File) => {
    if (!validateFile(browserFile.name, browserFile.size)) return;
    setFile({
      uri: URL.createObjectURL(browserFile),
      name: formatFileName(browserFile.name),
      mime: browserFile.type || undefined,
      size: browserFile.size,
    });
  };

  const webDropHandlers = Platform.OS === "web"
    ? {
        onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(),
        onDrop: (event: {
          preventDefault: () => void;
          dataTransfer?: { files?: ArrayLike<File> };
        }) => {
          event.preventDefault();
          const droppedFile = event.dataTransfer?.files?.[0];
          if (droppedFile) selectDroppedFile(droppedFile);
        },
      }
    : {};

  const handleUpload = async (wholeWorkConfirmed = false) => {
    if (uploadLockRef.current || !user || !file) return;
    if (!arquivoId && !destino) {
      toastError(
        "Escolha onde organizar o arquivo",
        "Selecione Toda a obra, um ambiente existente ou crie um novo ambiente.",
      );
      return;
    }
    if (!arquivoId && destino === NEW_ENVIRONMENT && !novoAmbiente.trim()) {
      toastError("Informe o novo ambiente", "Use um nome como Cozinha, Suíte ou Recepção.");
      return;
    }
    if (!arquivoId && destino === WHOLE_WORK && !wholeWorkConfirmed) {
      setConfirmWholeWork(true);
      return;
    }
    uploadLockRef.current = true;
    setUploading(true);
    try {
      const format = validateFile(file.name, file.size);
      if (!format) return;
      const contentType = format.mime;
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
        const typedEnvironment = novoAmbiente.trim();
        const existingEnvironment = ambientes.find(
          (item) => item.localeCompare(typedEnvironment, "pt-BR", { sensitivity: "base" }) === 0,
        );
        const ambiente =
          destino === NEW_ENVIRONMENT
            ? existingEnvironment || typedEnvironment
          : destino === WHOLE_WORK
            ? undefined
            : destino || undefined;
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
      } else if (error instanceof ApiError) {
        const feedback = uploadErrorFeedback(error.code, error.message);
        toastError(
          feedback?.title || "Não foi possível enviar",
          feedback?.message || "Tente novamente.",
        );
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
            <Text style={styles.sectionTitle}>Onde este arquivo será usado?</Text>
            <Text style={styles.helper}>
              Escolha Toda a obra ou associe o documento a um ambiente específico.
            </Text>
            <View style={styles.destinationGrid} accessibilityRole="radiogroup">
              <Pressable
                style={[styles.destination, destino === WHOLE_WORK && styles.destinationActive]}
                onPress={() => setDestino(WHOLE_WORK)}
                disabled={uploading}
                accessibilityRole="radio"
                accessibilityState={{ selected: destino === WHOLE_WORK }}
              >
                <Building2 size={18} color={destino === WHOLE_WORK ? colors.white : colors.primary} />
                <Text style={[styles.destinationText, destino === WHOLE_WORK && styles.destinationTextActive]}>
                  Toda a obra
                </Text>
              </Pressable>
              {ambientes.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.destination, destino === item && styles.destinationActive]}
                  onPress={() => setDestino(item)}
                  disabled={uploading}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: destino === item }}
                >
                  <Text style={[styles.destinationText, destino === item && styles.destinationTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.destination, destino === NEW_ENVIRONMENT && styles.destinationActive]}
                onPress={() => setDestino(NEW_ENVIRONMENT)}
                disabled={uploading}
                accessibilityRole="radio"
                accessibilityState={{ selected: destino === NEW_ENVIRONMENT }}
              >
                <Plus size={18} color={destino === NEW_ENVIRONMENT ? colors.white : colors.primary} />
                <Text style={[styles.destinationText, destino === NEW_ENVIRONMENT && styles.destinationTextActive]}>
                  Novo ambiente
                </Text>
              </Pressable>
            </View>
            {destino === NEW_ENVIRONMENT && (
              <AppInput
                label="Nome do novo ambiente"
                value={novoAmbiente}
                onChangeText={setNovoAmbiente}
                placeholder="Ex.: Cozinha, suíte ou recepção"
                maxLength={80}
                editable={!uploading}
                autoCapitalize="words"
              />
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Arquivo</Text>
        <Text style={styles.helper}>
          {UPLOAD_FORMATS_DESCRIPTION}
        </Text>
        {file ? (
          <View style={styles.preview}>
            {uploadFormatFor(file.name)?.previewImage ? (
              <Image source={{ uri: file.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.fileIcon}>
                <FileCheck2 size={25} color={colors.primary} />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>
              <Text style={styles.fileMeta}>
                {[uploadFormatFor(file.name)?.label, fileSize]
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
          <View style={styles.emptyFile} {...webDropHandlers}>
            <Upload size={34} color={colors.primary} />
            <Text style={styles.emptyFileTitle}>Selecione um arquivo</Text>
            <Text style={styles.emptyFileText}>
              {Platform.OS === "web"
                ? "Arraste um arquivo aqui ou selecione abaixo."
                : "Escolha um documento ou tire uma foto agora."}
            </Text>
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
          {(!isRevision || revisionContentType === "image/jpeg") && (
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

      <View style={[styles.footer, { paddingBottom: spacing.lg + insets.bottom }]}>
        {uploading && (
          <View style={styles.uploadingFeedback} accessibilityLiveRegion="polite">
            <ObradocsUploadMotion
              size={50}
              accessibilityLabel={isRevision ? "Enviando revisão" : "Enviando arquivo"}
            />
            <View style={styles.uploadingText}>
              <Text style={styles.uploadingTitle}>
                {isRevision ? "Enviando nova revisão" : "Enviando arquivo"}
              </Text>
              {!!file?.name && (
                <Text style={styles.uploadingFile} numberOfLines={1}>{file.name}</Text>
              )}
            </View>
          </View>
        )}
        <AppButton
          label={isRevision ? "Enviar revisão" : "Enviar arquivo"}
          icon={<Upload size={19} color={colors.white} />}
          onPress={handleUpload}
          disabled={!file || uploading}
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
      <ConfirmDialog
        visible={confirmWholeWork}
        title="Salvar em Toda a obra?"
        message="Este arquivo ficará em “Toda a obra” e não será associado a um ambiente específico."
        confirmLabel="Salvar em Toda a obra"
        loading={uploading}
        onCancel={() => setConfirmWholeWork(false)}
        onConfirm={() => {
          setConfirmWholeWork(false);
          handleUpload(true);
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
  destinationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  destination: {
    minHeight: 46,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  destinationActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  destinationText: { color: colors.text, fontWeight: "700", flexShrink: 1 },
  destinationTextActive: { color: colors.white },
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
  uploadingFeedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  uploadingText: { flex: 1, minWidth: 0 },
  uploadingTitle: { color: colors.text, fontWeight: "700" },
  uploadingFile: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
});

export default UploadArquivoScreen;
