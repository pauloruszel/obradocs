import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { Arquivo, ArquivoTipo } from "@models/models";
import { listarArquivos } from "@services/arquivosService";
import { supabase } from "@services/supabase";
import { useAuth } from "@context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { toastError } from "@utils/toast";

type Props = NativeStackScreenProps<RootStackParamList, "ObraDetail">;

const categorias: { label: string; value: ArquivoTipo }[] = [
  { label: "Orcamentos", value: "ORCAMENTO" },
  { label: "Notas Fiscais", value: "NOTA_FISCAL" },
  { label: "Projetos", value: "PROJETO" },
  { label: "Fotos", value: "FOTO" },
];

const ObraDetailScreen = ({ route, navigation }: Props) => {
  const { obraId } = route.params;
  const { user } = useAuth();
  const [selected, setSelected] = useState<ArquivoTipo>("FOTO");
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [papel, setPapel] = useState<"OWNER" | "EDITOR" | "VIEWER">("VIEWER");

  const loadPermissao = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("permissoes")
      .select("papel")
      .eq("obra_id", obraId)
      .eq("user_id", user.id)
      .single();
    if (error) {
      const msg = (error as Error)?.message || "";
      const offline = msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch");
      toastError(offline ? "Sem conexao" : "Erro ao carregar permissao", offline ? "Verifique a internet." : "Tente recarregar a obra.");
      return;
    }
    if (data?.papel) setPapel(data.papel);
  };

  const loadArquivos = async () => {
    setLoading(true);
    try {
      const result = await listarArquivos(obraId, selected);
      const filtered = selected ? result.filter((a) => a.tipo === selected) : result;
      setArquivos(filtered);
    } catch (e) {
      console.warn(e);
      const msg = (e as Error)?.message || "";
      const offline = msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch");
      toastError(offline ? "Sem conexao" : "Erro ao carregar arquivos", offline ? "Verifique a internet." : "Verifique o acesso a obra.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPermissao();
      loadArquivos();
    }, [selected, obraId])
  );

  useEffect(() => {
    const channel = supabase
      .channel(`arquivos-obra-${obraId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arquivos", filter: `obra_id=eq.${obraId}` },
        () => {
          loadArquivos();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [obraId, selected]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArquivos();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Arquivo }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("ArquivoView", {
          arquivoId: item.id,
          obraId,
          path: item.storage_path,
          nome: item.nome_original,
          tipo: item.tipo,
        })
      }
    >
      <Text style={styles.cardTitle}>{item.nome_original}</Text>
      <Text style={styles.cardSubtitle}>{new Date(item.created_at || "").toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {categorias.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.tab, selected === c.value && styles.tabActive]}
            onPress={() => setSelected(c.value)}
          >
            <Text style={[styles.tabText, selected === c.value && styles.tabTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Historico", { obraId })}>
          <Text style={styles.secondaryText}>Historico</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Permissoes", { obraId, isOwner: papel === "OWNER" })}
        >
          <Text style={styles.secondaryText}>Permissoes</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={arquivos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum arquivo nesta categoria.</Text>}
        />
      )}
      {(papel === "OWNER" || papel === "EDITOR") && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("UploadArquivo", { obraId })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa", padding: 12 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d0d4d9",
  },
  tabActive: {
    backgroundColor: "#0C5BAA",
    borderColor: "#0C5BAA",
  },
  tabText: { color: "#4b5563", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  actions: { flexDirection: "row", gap: 8, marginBottom: 8 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#0C5BAA",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#0C5BAA", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: { fontWeight: "700" },
  cardSubtitle: { color: "#6b7280", marginTop: 4 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 12 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0C5BAA",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "700" },
});

export default ObraDetailScreen;
