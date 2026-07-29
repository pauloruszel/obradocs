import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MoreVertical, ShieldCheck, Trash2, UserRound, Users } from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import {
  atualizarPermissao,
  convidarUsuarioPorEmail,
  listarPermissoes,
  removerPermissao,
} from "@services/permissoesService";
import { Permissao, Papel } from "@models/models";
import { toastError, toastSuccess } from "@utils/toast";
import { papelLabel } from "@utils/display";
import ActionMenu, { ActionMenuItem } from "@components/ActionMenu";
import AppButton from "@components/AppButton";
import AppInput from "@components/AppInput";
import ScreenState from "@components/ScreenState";
import { colors, layout, radius, spacing, typography } from "@theme/index";
import { validateEmail } from "@utils/validation";

type Props = NativeStackScreenProps<RootStackParamList, "Permissoes">;

const PermissoesScreen = ({ route }: Props) => {
  const { obraId, isOwner } = route.params;
  const [permissions, setPermissions] = useState<Permissao[]>([]);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permissao | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setPermissions(await listarPermissoes(obraId));
    } catch (error) {
      const offline = /network|fetch/i.test((error as Error)?.message || "");
      toastError(
        offline ? "Sem conexão" : "Não foi possível carregar os acessos",
        offline ? "Verifique sua internet." : "Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [obraId]);

  const handleAdd = async () => {
    const validation = validateEmail(email);
    setEmailError(validation);
    if (validation) return;

    setAdding(true);
    try {
      await convidarUsuarioPorEmail(obraId, email.trim(), "EDITOR");
      await load();
      setEmail("");
      toastSuccess("Acesso adicionado", "A pessoa entrou como Editora.");
    } catch (error) {
      toastError("Não foi possível adicionar", (error as Error).message || "Tente novamente.");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (permission: Permissao, role: Papel) => {
    if (permission.papel === role) return;
    setUpdatingId(permission.id);
    try {
      await atualizarPermissao(obraId, permission.id, role);
      await load();
      toastSuccess("Permissão atualizada");
    } catch (error) {
      toastError("Não foi possível atualizar", (error as Error).message || "Tente novamente.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (permission: Permissao) => {
    setUpdatingId(permission.id);
    try {
      await removerPermissao(obraId, permission.id);
      await load();
      toastSuccess("Acesso removido");
    } catch (error) {
      toastError("Não foi possível remover", (error as Error).message || "Tente novamente.");
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmRemove = (permission: Permissao) => {
    const name = permission.profiles?.nome || "Esta pessoa";
    Alert.alert("Remover acesso?", `${name} não poderá mais acessar esta obra.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => handleRemove(permission) },
    ]);
  };

  const menuItems: ActionMenuItem[] = selectedPermission
    ? [
        {
          label: "Definir como Editor",
          icon: <ShieldCheck size={20} color={colors.text} />,
          onPress: () => handleUpdate(selectedPermission, "EDITOR"),
        },
        {
          label: "Definir como Visualizador",
          icon: <UserRound size={20} color={colors.text} />,
          onPress: () => handleUpdate(selectedPermission, "VIEWER"),
        },
        {
          label: "Remover acesso",
          icon: <Trash2 size={20} color={colors.danger} />,
          onPress: () => confirmRemove(selectedPermission),
          destructive: true,
        },
      ]
    : [];

  if (loading) return <ScreenState loading title="Carregando permissões" />;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {isOwner && (
          <View style={styles.addSection}>
            <Text style={styles.sectionTitle}>Adicionar pessoa</Text>
            <Text style={styles.helper}>
              Informe o e-mail cadastrado no Obradocs. O acesso inicial será de Editor.
            </Text>
            <View style={styles.addForm}>
              <AppInput
                label="E-mail"
                placeholder="usuario@exemplo.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) setEmailError("");
                }}
                error={emailError}
                editable={!adding}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <AppButton
                label="Adicionar acesso"
                onPress={handleAdd}
                loading={adding}
                disabled={!email.trim()}
              />
            </View>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Pessoas com acesso</Text>
          <View style={styles.countBadge}>
            <Text style={styles.count}>{permissions.length}</Text>
          </View>
        </View>

        <FlatList
          data={permissions}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={permissions.length === 0 ? styles.emptyList : styles.list}
          renderItem={({ item }) => {
            const name = item.profiles?.nome || "Usuário";
            const initial = name.trim().charAt(0).toUpperCase();
            const canManage = isOwner && item.papel !== "OWNER";
            return (
              <View style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.personInfo}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  {!!item.profiles?.email && (
                    <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
                      {item.profiles.email}
                    </Text>
                  )}
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{papelLabel[item.papel]}</Text>
                </View>
                {canManage && (
                  <Pressable
                    style={styles.moreButton}
                    onPress={() => setSelectedPermission(item)}
                    disabled={updatingId === item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Gerenciar acesso de ${name}`}
                  >
                    <MoreVertical size={21} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <ScreenState
              icon={<Users size={42} color={colors.textMuted} />}
              title="Nenhuma pessoa com acesso"
              description="Adicione pessoas pelo e-mail cadastrado no Obradocs."
            />
          }
        />
      </View>

      <ActionMenu
        visible={!!selectedPermission}
        title={selectedPermission?.profiles?.nome || "Gerenciar acesso"}
        items={menuItems}
        onClose={() => setSelectedPermission(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  content: { flex: 1, width: "100%", maxWidth: layout.maxContentWidth, padding: spacing.lg },
  addSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: { ...typography.sectionTitle },
  helper: { color: colors.textMuted, lineHeight: 20, marginTop: spacing.xs },
  addForm: { gap: spacing.lg, marginTop: spacing.lg },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  count: { color: colors.primary, fontWeight: "800" },
  list: { paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  card: {
    minHeight: 72,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: { color: colors.primary, fontWeight: "800" },
  personInfo: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontWeight: "700" },
  email: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  roleBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm,
  },
  roleText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  moreButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});

export default PermissoesScreen;
