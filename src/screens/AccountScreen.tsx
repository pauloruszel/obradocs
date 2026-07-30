import React, { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  LogOut,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { useAuth } from "@context/AuthContext";
import { publicApiUrl } from "@services/apiClient";
import { toastError, toastInfo } from "@utils/toast";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import { colors, layout, radius, spacing, typography } from "@theme/index";

const AccountScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [dangerVisible, setDangerVisible] = useState(false);

  const open = (path: string) =>
    Linking.openURL(publicApiUrl(path)).catch(() =>
      toastError("Não foi possível abrir a página", "Tente novamente em alguns instantes."),
    );

  const confirmDelete = () => {
    if (!password) {
      toastError("Informe sua senha", "A senha atual confirma que a conta pertence a você.");
      return;
    }
    Alert.alert(
      "Excluir conta permanentemente?",
      "Suas obras sem outro proprietário e os arquivos delas serão excluídos. Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir conta",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount(password);
              toastInfo("Conta excluída", "Seus dados foram encaminhados para exclusão.");
            } catch (error) {
              toastError("Não foi possível excluir a conta", (error as Error).message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const links = [
    {
      label: "Meu Plano",
      icon: CreditCard,
      onPress: () => navigation.navigate("MeuPlano"),
      role: "button" as const,
    },
    {
      label: "Política de Privacidade",
      icon: ShieldCheck,
      onPress: () => open("/privacy.html"),
      role: "link" as const,
    },
    { label: "Termos de Uso", icon: FileText, onPress: () => open("/terms.html"), role: "link" as const },
    { label: "Ajuda e contato", icon: CircleHelp, onPress: () => open("/support.html"), role: "link" as const },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <UserRound size={28} color={colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.nome}</Text>
          <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Perfil e assinatura</Text>
      <View style={styles.linkGroup}>
        {links.map(({ label, icon: Icon, onPress, role }, index) => (
          <Pressable
            key={label}
            style={({ pressed }) => [
              styles.linkRow,
              index < links.length - 1 && styles.linkBorder,
              pressed && styles.pressed,
            ]}
            onPress={onPress}
            accessibilityRole={role}
          >
            <View style={styles.linkIcon}>
              <Icon size={20} color={colors.primary} />
            </View>
            <Text style={styles.linkText}>{label}</Text>
            <ChevronRight size={19} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <AppButton
        label="Sair da conta"
        variant="secondary"
        icon={<LogOut size={19} color={colors.primary} />}
        onPress={signOut}
        style={styles.signOut}
      />

      <Pressable
        style={styles.dangerHeader}
        onPress={() => setDangerVisible((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: dangerVisible }}
      >
        <View style={styles.dangerIcon}>
          <Trash2 size={20} color={colors.danger} />
        </View>
        <View style={styles.dangerHeaderText}>
          <Text style={styles.dangerTitle}>Excluir conta</Text>
          <Text style={styles.dangerSummary}>Remover permanentemente seus dados</Text>
        </View>
        <ChevronDown
          size={20}
          color={colors.textMuted}
          style={{ transform: [{ rotate: dangerVisible ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {dangerVisible && (
        <View style={styles.dangerContent}>
          <Text style={styles.description}>
            Obras sem outro proprietário e seus arquivos serão excluídos permanentemente.
          </Text>
          <AppInput
            label="Senha atual"
            placeholder="Confirme sua senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!deleting}
            autoCapitalize="none"
            autoComplete="current-password"
          />
          <AppButton
            label="Excluir minha conta"
            variant="danger"
            onPress={confirmDelete}
            loading={deleting}
            disabled={!password}
            style={styles.deleteButton}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profile: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  profileInfo: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 19, fontWeight: "800" },
  email: { color: colors.textMuted, marginTop: spacing.xs },
  sectionTitle: { ...typography.sectionTitle, marginBottom: spacing.md },
  linkGroup: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  linkRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  linkBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.surfaceMuted },
  linkIcon: { width: 36, alignItems: "flex-start" },
  linkText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" },
  signOut: { marginVertical: spacing.xl },
  dangerHeader: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  dangerHeaderText: { flex: 1 },
  dangerTitle: { color: colors.danger, fontWeight: "700" },
  dangerSummary: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  dangerContent: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  description: { color: colors.textMuted, lineHeight: 21, marginBottom: spacing.lg },
  deleteButton: { marginTop: spacing.lg },
});

export default AccountScreen;
