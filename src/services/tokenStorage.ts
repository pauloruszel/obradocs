import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { Session } from "@models/models";

const SESSION_KEY = "obradocs.session";

export const getStoredSession = async (): Promise<Session | null> => {
  const value =
    Platform.OS === "web"
      ? await AsyncStorage.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);
  return value ? (JSON.parse(value) as Session) : null;
};

export const setStoredSession = async (session: Session): Promise<void> => {
  const value = JSON.stringify(session);
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(SESSION_KEY, value);
  } else {
    await SecureStore.setItemAsync(SESSION_KEY, value);
  }
};

export const clearStoredSession = async (): Promise<void> => {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
};
