import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "obradocs.access_token";

export const tokenStorage = {
  getAccessToken: () => AsyncStorage.getItem(ACCESS_TOKEN_KEY),
  setAccessToken: (accessToken: string) => AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
  clear: () => AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
};
