import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  Building2,
  ChevronRight,
  CircleUserRound,
  KeyRound,
  Plus,
} from "lucide-react-native";
import { listObrasDoUsuario } from "@services/obrasService";
import { useAuth } from "@context/AuthContext";
import { Obra } from "@models/models";
import { RootStackParamList } from "@navigation/AppNavigator";
import { toastError } from "@utils/toast";
import AppButton from "@components/AppButton";
import ScreenState from "@components/ScreenState";
import { colors, layout, radius, spacing } from "@theme/index";

type Nav = NativeStackNavigationProp<RootStackParamList, "ObrasList">;

const ObrasListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Minhas obras",
      headerRight: () => (
        <Pressable
          style={styles.accountButton}
          onPress={() => navigation.navigate("Account")}
          accessibilityRole="button"
          accessibilityLabel="Abrir minha conta"
        >
          <CircleUserRound size={24} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const load = useCallback(
    async (showInitialLoader = false) => {
      if (!user) return;
      if (showInitialLoader) setLoading(true);
      try {
        setObras(await listObrasDoUsuario());
      } catch (error) {
        const message = (error as Error)?.message || "";
        const offline = /network|fetch/i.test(message);
        toastError(
          offline ? "Sem conexão" : "Não foi possível carregar as obras",
          offline ? "Verifique sua internet." : "Tente novamente em alguns instantes.",
        );
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      load(obras.length === 0);
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Obra }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => navigation.navigate("ObraDetail", { obraId: item.id, nome: item.nome })}
      accessibilityRole="button"
      accessibilityLabel={`Abrir obra ${item.nome}`}
    >
      <View style={styles.cardIcon}>
        <Building2 size={22} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.nome}
        </Text>
        <View style={styles.codeRow}>
          <KeyRound size={14} color={colors.textMuted} />
          <Text style={styles.cardSubtitle}>{item.codigo_compartilhamento}</Text>
        </View>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
  );

  if (loading) {
    return <ScreenState loading title="Carregando suas obras" />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.actions}>
          <AppButton
            label="Nova obra"
            icon={<Plus size={19} color={colors.white} />}
            onPress={() => navigation.navigate("NovaObra")}
            style={styles.action}
          />
          <AppButton
            label="Entrar com código"
            icon={<KeyRound size={18} color={colors.primary} />}
            onPress={() => navigation.navigate("EntrarObra")}
            variant="secondary"
            style={styles.action}
          />
        </View>

        <FlatList
          data={obras}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={obras.length === 0 ? styles.emptyList : styles.list}
          ListHeaderComponent={
            obras.length > 0 ? <Text style={styles.listTitle}>{obras.length} {obras.length === 1 ? "obra" : "obras"}</Text> : null
          }
          ListEmptyComponent={
            <ScreenState
              icon={<Building2 size={44} color={colors.primary} />}
              title="Sua primeira obra começa aqui"
              description="Crie uma obra para organizar documentos ou entre em uma obra existente usando um código."
              actionLabel="Criar nova obra"
              onAction={() => navigation.navigate("NovaObra")}
            />
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  content: { flex: 1, width: "100%", maxWidth: layout.maxContentWidth, padding: spacing.lg },
  accountButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -spacing.sm,
  },
  actions: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  action: { flex: 1 },
  list: { paddingBottom: spacing.xxl },
  listTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  card: {
    minHeight: 76,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  cardPressed: { backgroundColor: colors.surfaceMuted },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  codeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  cardSubtitle: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  emptyList: { flexGrow: 1 },
});

export default ObrasListScreen;
