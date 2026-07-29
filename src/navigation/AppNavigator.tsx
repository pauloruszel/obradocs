import { useAuth } from "@context/AuthContext";
import ArquivoViewScreen from "@screens/ArquivoViewScreen";
import EntrarObraScreen from "@screens/EntrarObraScreen";
import HistoricoScreen from "@screens/HistoricoScreen";
import LoginScreen from "@screens/LoginScreen";
import ForgotPasswordScreen from "@screens/ForgotPasswordScreen";
import NovaObraScreen from "@screens/NovaObraScreen";
import ObraDetailScreen from "@screens/ObraDetailScreen";
import ObrasListScreen from "@screens/ObrasListScreen";
import PermissoesScreen from "@screens/PermissoesScreen";
import ResetPasswordScreen from "@screens/ResetPasswordScreen";
import UploadArquivoScreen from "@screens/UploadArquivoScreen";
import AccountScreen from "@screens/AccountScreen";
import TermsAcceptanceScreen from "@screens/TermsAcceptanceScreen";
import ReportContentScreen from "@screens/ReportContentScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Papel } from "@models/models";

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  ObrasList: undefined;
  NovaObra: undefined;
  EntrarObra: undefined;
  ObraDetail: { obraId: string; nome: string };
  UploadArquivo: { obraId: string };
  ArquivoView: { arquivoId: string; obraId: string; path: string; nome: string; tipo: string; papel?: Papel };
  Historico: { obraId: string };
  Permissoes: { obraId: string; isOwner: boolean };
  Account: undefined;
  TermsAcceptance: undefined;
  ReportContent: {
    targetType: "OBRA" | "ARQUIVO";
    targetId: string;
    title: string;
  };
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
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : !user.terms_accepted ? (
        <Stack.Screen
          name="TermsAcceptance"
          component={TermsAcceptanceScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen name="ObrasList" component={ObrasListScreen} options={{ title: "Obras" }} />
          <Stack.Screen name="Account" component={AccountScreen} options={{ title: "Minha conta" }} />
          <Stack.Screen
            name="ReportContent"
            component={ReportContentScreen}
            options={{ title: "Denunciar conteúdo" }}
          />
          <Stack.Screen name="NovaObra" component={NovaObraScreen} options={{ title: "Nova obra" }} />
          <Stack.Screen
            name="EntrarObra"
            component={EntrarObraScreen}
            options={{ title: "Entrar em uma obra" }}
          />
          <Stack.Screen
            name="ObraDetail"
            component={ObraDetailScreen}
            options={({ route }) => ({ title: route.params.nome })}
          />
          <Stack.Screen
            name="UploadArquivo"
            component={UploadArquivoScreen}
            options={{ title: "Enviar arquivo" }}
          />
          <Stack.Screen name="ArquivoView" component={ArquivoViewScreen} options={{ title: "Arquivo" }} />
          <Stack.Screen name="Historico" component={HistoricoScreen} options={{ title: "Histórico" }} />
          <Stack.Screen name="Permissoes" component={PermissoesScreen} options={{ title: "Permissões" }} />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false, presentation: "modal" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
