import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "obradocs.access_token";
const REFRESH_TOKEN_KEY = "obradocs.refresh_token";

export const tokenStorage = {
  getAccessToken: () => AsyncStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => AsyncStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: async (accessToken: string, refreshToken: string) => {
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, accessToken],
      [REFRESH_TOKEN_KEY, refreshToken],
    ]);
  },
  clear: () => AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]),
};
