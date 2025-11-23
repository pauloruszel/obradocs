import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { listObrasDoUsuario } from "@services/obrasService";
import { useAuth } from "@context/AuthContext";
import { Obra } from "@models/models";
import { RootStackParamList } from "@navigation/AppNavigator";
import { toastError } from "@utils/toast";

type Nav = NativeStackNavigationProp<RootStackParamList, "ObrasList">;

const ObrasListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await listObrasDoUsuario(user.id);
      setObras(result);
    } catch (e) {
      console.warn(e);
      const msg = (e as Error)?.message || "";
      const offline = msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch");
      toastError(
        offline ? "Sem conexao" : "Falha ao carregar obras",
        offline ? "Verifique sua internet." : "Verifique sua conexao ou refaca o login.",
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Obra }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ObraDetail", { obraId: item.id, nome: item.nome })}
    >
      <Text style={styles.cardTitle}>{item.nome}</Text>
      <Text style={styles.cardSubtitle}>Codigo: {item.codigo_compartilhamento}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Obras</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.link}>Sair</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("NovaObra")}>
          <Text style={styles.primaryText}>Nova Obra</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("EntrarObra")}>
          <Text style={styles.secondaryText}>Entrar com codigo</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={obras}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma obra ainda. Crie ou entre com um codigo.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa", padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#0C5BAA" },
  link: { color: "#e63946", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, marginBottom: 12 },
  primaryButton: { flex: 1, backgroundColor: "#0C5BAA", padding: 12, borderRadius: 10, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "600" },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#0C5BAA",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#0C5BAA", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardSubtitle: { color: "#6b7280", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 20, color: "#6b7280" },
});

export default ObrasListScreen;
