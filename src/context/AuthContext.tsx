import { AuthUser, Profile, Session } from "@models/models";
import {
  acceptTerms as confirmTerms,
  deleteAccount as removeAccount,
  restoreSession,
  signIn as login,
  signOut as logout,
  signUp as register,
} from "@services/authService";
import { setUnauthorizedHandler } from "@services/apiClient";
import { aceitarConvite } from "@services/permissoesService";
import { toastError, toastInfo, toastSuccess } from "@utils/toast";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";

type AuthContextValue = {
  session: Session | null;
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    acceptedTerms: boolean,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  acceptTerms: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const clearInviteFromBrowserUrl = () => {
  const browser = globalThis as typeof globalThis & {
    location?: { href: string };
    history?: { replaceState: (data: unknown, unused: string, url?: string | URL | null) => void };
  };
  if (!browser.location || !browser.history) return;
  const [withoutHash, hash] = browser.location.href.split("#", 2);
  const [path, query] = withoutHash.split("?", 2);
  const cleanedQuery = query
    ?.split("&")
    .filter((item: string) => !item.startsWith("invite="))
    .join("&");
  browser.history.replaceState(
    null,
    "",
    `${path}${cleanedQuery ? `?${cleanedQuery}` : ""}${hash ? `#${hash}` : ""}`,
  );
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const acceptingInvite = useRef(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      toastInfo("Sessao encerrada", "Faca login novamente para continuar.");
    });

    restoreSession()
      .then(setSession)
      .catch((error) => console.warn("Falha ao restaurar sessao", error))
      .finally(() => setLoading(false));

    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const capture = (url: string | null) => {
      const match = url?.match(/[?&]invite=([^&#]+)/);
      if (match) setInviteToken(decodeURIComponent(match[1]));
    };
    Linking.getInitialURL().then(capture);
    const subscription = Linking.addEventListener("url", ({ url }) => capture(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!session || !inviteToken || acceptingInvite.current) return;
    acceptingInvite.current = true;
    aceitarConvite(inviteToken)
      .then((obra) => toastSuccess("Convite aceito", `Você já pode acessar ${obra.nome}.`))
      .catch((error) => toastError("Não foi possível aceitar o convite", (error as Error).message))
      .finally(() => {
        clearInviteFromBrowserUrl();
        setInviteToken(null);
        acceptingInvite.current = false;
      });
  }, [session, inviteToken]);

  const signIn = async (email: string, password: string) => {
    try {
      setSession(await login(email, password));
    } catch (error) {
      toastError("Falha no login", (error as Error).message);
    }
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
    acceptedTerms: boolean,
  ) => {
    try {
      setSession(await register(name, email, password, acceptedTerms));
    } catch (error) {
      toastError("Erro ao criar conta", (error as Error).message || "Tente novamente");
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } finally {
      setSession(null);
    }
  };

  const deleteAccount = async (password: string) => {
    await removeAccount(password);
    setSession(null);
  };

  const acceptTerms = async () => {
    const user = await confirmTerms();
    setSession((current) => (current ? { ...current, user } : current));
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile: session?.user ?? null,
        loading,
        signIn,
        signUp,
        signOut,
        deleteAccount,
        acceptTerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
};
