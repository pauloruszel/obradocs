import { AuthUser, Session } from "@models/models";
import { ApiError, apiRequest } from "./apiClient";
import { clearStoredSession, getStoredSession, setStoredSession } from "./tokenStorage";

const saveSession = async (session: Session) => {
  await setStoredSession(session);
  return session;
};

export const signIn = async (email: string, senha: string) =>
  saveSession(
    await apiRequest<Session>("/auth/login", {
      method: "POST",
      authenticated: false,
      body: JSON.stringify({ email, senha }),
    }),
  );

export const signUp = async (
  nome: string,
  email: string,
  senha: string,
  aceitouTermos: boolean,
) =>
  saveSession(
    await apiRequest<Session>("/auth/register", {
      method: "POST",
      authenticated: false,
      body: JSON.stringify({ nome, email, senha, aceitou_termos: aceitouTermos }),
    }),
  );

export const restoreSession = async (): Promise<Session | null> => {
  if (!(await getStoredSession())) {
    return null;
  }
  try {
    const user = await apiRequest<AuthUser>("/auth/me");
    const session = await getStoredSession();
    return session ? { ...session, user } : null;
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      await clearStoredSession();
      return null;
    }
    return getStoredSession();
  }
};

export const signOut = async () => {
  const session = await getStoredSession();
  try {
    if (session?.refresh_token) {
      await apiRequest<void>("/auth/logout", {
        method: "POST",
        authenticated: false,
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
    }
  } finally {
    await clearStoredSession();
  }
};

export const deleteAccount = async (senha: string) => {
  await apiRequest<void>("/auth/account", {
    method: "DELETE",
    body: JSON.stringify({ senha }),
  });
  await clearStoredSession();
};

export const acceptTerms = () =>
  apiRequest<AuthUser>("/auth/accept-terms", {
    method: "POST",
  });

export const solicitarRedefinicaoSenha = (email: string) =>
  apiRequest<void>("/auth/forgot-password", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ email }),
  });

export const redefinirSenha = (token: string, senha: string) =>
  apiRequest<void>("/auth/reset-password", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ token, senha }),
  });
