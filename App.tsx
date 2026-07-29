import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import FlashMessage from "react-native-flash-message";
import { colors } from "./src/theme";
import { installWebAlertPolyfill } from "./src/utils/webAlert";

installWebAlertPolyfill(Alert, Platform.OS === "web");

const linking = {
  prefixes: ["obradocs://"],
  config: {
    screens: {
      ResetPassword: "reset",
      Login: "login",
    },
  },
};

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer
        linking={Platform.OS === "web" ? undefined : linking}
        theme={navigationTheme}
      >
        <StatusBar style="dark" />
        <AppNavigator />
        <FlashMessage position="top" floating />
      </NavigationContainer>
    </AuthProvider>
  );
}
