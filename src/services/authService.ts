import { Profile } from "@models/models";
import { apiRequest } from "./apiClient";
import { tokenStorage } from "./tokenStorage";

export type AuthUser = Profile;

export type AuthSession = {
  access_token: string;
  user: AuthUser;
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

const persistSession = async (response: AuthResponse): Promise<AuthSession> => {
  await tokenStorage.setAccessToken(response.access_token);
  return {
    access_token: response.access_token,
    user: response.user,
  };
};

export const signIn = async (email: string, password: string) => {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ email: email.trim(), senha: password }),
  });
  return { session: await persistSession(response), profile: response.user };
};

export const signUp = async (nome: string, email: string, password: string) => {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ nome: nome.trim() || email.trim(), email: email.trim(), senha: password }),
  });
  return { session: await persistSession(response), profile: response.user };
};

export const getCurrentProfile = () => apiRequest<Profile>("/auth/me");

export const restoreSession = async (): Promise<AuthSession | null> => {
  const accessToken = await tokenStorage.getAccessToken();
  if (!accessToken) return null;

  try {
    const profile = await getCurrentProfile();
    return { access_token: accessToken, user: profile };
  } catch {
    await tokenStorage.clear();
    return null;
  }
};

export const signOut = () => tokenStorage.clear();
