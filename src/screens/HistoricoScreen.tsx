import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { listarHistorico } from '@services/historicoService';
import { Historico } from '@models/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Historico'>;

const HistoricoScreen = ({ route }: Props) => {
  const { obraId } = route.params;
  const [logs, setLogs] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarHistorico(obraId)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [obraId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.acao}</Text>
            <Text style={styles.subtitle}>{new Date(item.created_at || '').toLocaleString()}</Text>
            <Text style={styles.detail}>{JSON.stringify(item.detalhes)}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum evento.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa', padding: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontWeight: '700' },
  subtitle: { color: '#6b7280', marginTop: 4, marginBottom: 6 },
  detail: { color: '#111827', fontSize: 12 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 12 }
});

export default HistoricoScreen;
