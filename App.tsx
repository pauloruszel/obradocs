import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import FlashMessage from "react-native-flash-message";

const linking = {
  prefixes: ["obradocs://"],      // deep link do app
  config: {
    screens: {
      // mapeia o path "reset" para a tela ResetPassword
      ResetPassword: "reset",
      Login: "login",
      // se quiser, pode mapear otras telas depois
    },
  },
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer linking={linking}>
        <StatusBar style="dark" />
        <AppNavigator />
        <FlashMessage position="top" />
      </NavigationContainer>
    </AuthProvider>
  );
}
