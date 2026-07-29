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
import { toastError, toastInfo } from "@utils/toast";
import React, { createContext, useContext, useEffect, useState } from "react";

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
