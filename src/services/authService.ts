import { Profile } from "@models/models";
import { apiRequest } from "./apiClient";
import { tokenStorage } from "./tokenStorage";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  profile?: Profile;
};

const persistSession = async (response: AuthResponse): Promise<AuthSession> => {
  await tokenStorage.setTokens(response.access_token, response.refresh_token);
  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    user: response.user,
  };
};

export const signIn = async (email: string, password: string) => {
  const response = await apiRequest<AuthResponse>("/v1/auth/login", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return { session: await persistSession(response), profile: response.profile };
};

export const signUp = async (nome: string, email: string, password: string) => {
  const response = await apiRequest<AuthResponse>("/v1/auth/register", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ nome: nome.trim() || email.trim(), email: email.trim(), password }),
  });
  return { session: await persistSession(response), profile: response.profile };
};

export const getCurrentProfile = () => apiRequest<Profile>("/v1/auth/me");

export const restoreSession = async (): Promise<AuthSession | null> => {
  const accessToken = await tokenStorage.getAccessToken();
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!accessToken || !refreshToken) return null;

  try {
    const profile = await getCurrentProfile();
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: profile.id, email: profile.email ?? "" },
    };
  } catch {
    await tokenStorage.clear();
    return null;
  }
};

export const signOut = async () => {
  const refreshToken = await tokenStorage.getRefreshToken();
  try {
    if (refreshToken) {
      await apiRequest<void>("/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
  } finally {
    await tokenStorage.clear();
  }
};

export const requestPasswordReset = (email: string) =>
  apiRequest<void>("/v1/auth/forgot-password", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ email: email.trim() }),
  });

export const resetPassword = (token: string, password: string) =>
  apiRequest<void>("/v1/auth/reset-password", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ token, password }),
  });
