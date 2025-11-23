import { useAuth } from "@context/AuthContext";
import ArquivoViewScreen from "@screens/ArquivoViewScreen";
import EntrarObraScreen from "@screens/EntrarObraScreen";
import HistoricoScreen from "@screens/HistoricoScreen";
import LoginScreen from "@screens/LoginScreen";
import NovaObraScreen from "@screens/NovaObraScreen";
import ObraDetailScreen from "@screens/ObraDetailScreen";
import ObrasListScreen from "@screens/ObrasListScreen";
import PermissoesScreen from "@screens/PermissoesScreen";
import UploadArquivoScreen from "@screens/UploadArquivoScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";

export type RootStackParamList = {
  Login: undefined;
  ObrasList: undefined;
  NovaObra: undefined;
  EntrarObra: undefined;
  ObraDetail: { obraId: string; nome: string };
  UploadArquivo: { obraId: string };
  ArquivoView: { arquivoId: string; obraId: string; path: string; nome: string; tipo: string };
  Historico: { obraId: string };
  Permissoes: { obraId: string; isOwner: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="ObrasList" component={ObrasListScreen} options={{ title: "Obras" }} />
          <Stack.Screen name="NovaObra" component={NovaObraScreen} options={{ title: "Nova Obra" }} />
          <Stack.Screen
            name="EntrarObra"
            component={EntrarObraScreen}
            options={{ title: "Entrar pela Obra" }}
          />
          <Stack.Screen
            name="ObraDetail"
            component={ObraDetailScreen}
            options={({ route }) => ({ title: route.params.nome })}
          />
          <Stack.Screen
            name="UploadArquivo"
            component={UploadArquivoScreen}
            options={{ title: "Enviar Arquivo" }}
          />
          <Stack.Screen name="ArquivoView" component={ArquivoViewScreen} options={{ title: "Arquivo" }} />
          <Stack.Screen name="Historico" component={HistoricoScreen} options={{ title: "Historico" }} />
          <Stack.Screen name="Permissoes" component={PermissoesScreen} options={{ title: "Permissoes" }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
