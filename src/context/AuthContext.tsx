import { Profile } from "@models/models";
import {
  AuthSession,
  AuthUser,
  getCurrentProfile,
  restoreSession,
  signIn as apiSignIn,
  signOut as apiSignOut,
  signUp as apiSignUp,
} from "@services/authService";
import { toastError, toastInfo } from "@utils/toast";
import React, { createContext, useContext, useEffect, useState } from "react";

type AuthContextValue = {
  session: AuthSession | null;
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const activeSession = await restoreSession();
        setSession(activeSession);
        if (activeSession) {
          setProfile(await getCurrentProfile());
        }
      } catch (err) {
        console.warn("Falha ao iniciar auth", (err as Error)?.message);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await apiSignIn(email, password);
      setSession(result.session);
      setProfile(result.profile ?? (await getCurrentProfile()));
    } catch (error) {
      toastError("Falha no login", (error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const result = await apiSignUp(name, email, password);
      setSession(result.session);
      setProfile(result.profile ?? (await getCurrentProfile()));
    } catch (error) {
      toastError("Erro ao criar conta", (error as Error).message ?? "Tente novamente");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await apiSignOut();
    setSession(null);
    setProfile(null);
    toastInfo("Sessao encerrada", "Faca login novamente para continuar.");
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
};
