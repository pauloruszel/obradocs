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
import MeuPlanoScreen from "@screens/MeuPlanoScreen";
import PlanoProfissionalScreen from "@screens/PlanoProfissionalScreen";
import UpgradeInteressesScreen from "@screens/UpgradeInteressesScreen";
import TermsAcceptanceScreen from "@screens/TermsAcceptanceScreen";
import ReportContentScreen from "@screens/ReportContentScreen";
import RevisoesArquivoScreen from "@screens/RevisoesArquivoScreen";
import CategoriasObraScreen from "@screens/CategoriasObraScreen";
import NotificacoesScreen from "@screens/NotificacoesScreen";
import CodigoAcessoScreen from "@screens/CodigoAcessoScreen";
import AprovacaoArquivoScreen from "@screens/AprovacaoArquivoScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Papel } from "@models/models";
import ScreenState from "@components/ScreenState";
import { colors } from "@theme/index";

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  ObrasList: undefined;
  Notificacoes: undefined;
  NovaObra: undefined;
  EntrarObra: undefined;
  ObraDetail: { obraId: string; nome: string };
  UploadArquivo: {
    obraId: string;
    arquivoId?: string;
    tipo?: import("@models/models").ArquivoTipo;
    categoriaId?: string;
    categoriaNome?: string;
    documentoNome?: string;
    contentType?: string;
    papel?: Papel;
  };
  ArquivoView: { arquivoId: string; obraId: string; path: string; nome: string; tipo: string; papel?: Papel };
  RevisoesArquivo: { arquivoId: string; obraId: string; nome: string; papel?: Papel };
  AprovacaoArquivo: { arquivoId: string; obraId: string };
  CategoriasObra: { obraId: string };
  Historico: { obraId: string; clientPortal?: boolean };
  Permissoes: { obraId: string; isOwner: boolean };
  CodigoAcesso: { obraId: string; nome: string };
  Account: undefined;
  MeuPlano: undefined;
  PlanoProfissional: {
    origem?: "meu_plano" | "limite_obra" | "limite_armazenamento" | "limite_colaborador" | "limite_categoria";
  } | undefined;
  UpgradeInteresses: undefined;
  TermsAcceptance: undefined;
  ReportContent: { targetType: "OBRA" | "ARQUIVO"; targetId: string; title: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { user, loading } = useAuth();
  if (loading) return <ScreenState loading title="Preparando o Obradocs" />;

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: "700" }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
        </>
      ) : !user.terms_accepted ? (
        <Stack.Screen name="TermsAcceptance" component={TermsAcceptanceScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="ObrasList" component={ObrasListScreen} options={{ title: "Minhas obras" }} />
          <Stack.Screen name="Notificacoes" component={NotificacoesScreen} options={{ title: "Notificações" }} />
          <Stack.Screen name="Account" component={AccountScreen} options={{ title: "Minha conta" }} />
          <Stack.Screen name="MeuPlano" component={MeuPlanoScreen} options={{ title: "Meu Plano" }} />
          <Stack.Screen name="PlanoProfissional" component={PlanoProfissionalScreen} options={{ title: "Plano Profissional" }} />
          <Stack.Screen name="UpgradeInteresses" component={UpgradeInteressesScreen} options={{ title: "Interessados" }} />
          <Stack.Screen name="ReportContent" component={ReportContentScreen} options={{ title: "Denunciar conteúdo" }} />
          <Stack.Screen name="NovaObra" component={NovaObraScreen} options={{ title: "Nova obra" }} />
          <Stack.Screen name="EntrarObra" component={EntrarObraScreen} options={{ title: "Entrar em uma obra" }} />
          <Stack.Screen name="ObraDetail" component={ObraDetailScreen} options={({ route }) => ({ title: route.params.nome })} />
          <Stack.Screen name="UploadArquivo" component={UploadArquivoScreen} options={{ title: "Enviar arquivo" }} />
          <Stack.Screen name="ArquivoView" component={ArquivoViewScreen} options={{ title: "Arquivo" }} />
          <Stack.Screen name="RevisoesArquivo" component={RevisoesArquivoScreen} options={{ title: "Revisões" }} />
          <Stack.Screen name="AprovacaoArquivo" component={AprovacaoArquivoScreen} options={{ title: "Aprovação" }} />
          <Stack.Screen name="CategoriasObra" component={CategoriasObraScreen} options={{ title: "Categorias" }} />
          <Stack.Screen name="Historico" component={HistoricoScreen} options={{ title: "Histórico" }} />
          <Stack.Screen name="Permissoes" component={PermissoesScreen} options={{ title: "Permissões" }} />
          <Stack.Screen name="CodigoAcesso" component={CodigoAcessoScreen} options={{ title: "Código de acesso" }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false, presentation: "modal" }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
