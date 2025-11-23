import { Profile } from "@models/models";
import { supabase } from "@services/supabase";
import { Session, User } from "@supabase/supabase-js";
import { toastError, toastInfo } from "@utils/toast";
import React, { createContext, useContext, useEffect, useState } from "react";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession();
        setSession(activeSession);
        if (activeSession?.user) {
          await loadProfile(activeSession.user.id);
        }
      } catch (err) {
        console.warn("Falha ao iniciar auth", (err as Error)?.message);
      } finally {
        setLoading(false);
      }
    };
    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        toastInfo("Sessao encerrada", "Faca login novamente para continuar.");
      }
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) {
      console.warn("Erro carregando perfil", error.message);
      return;
    }
    setProfile(data as Profile);
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toastError("Falha no login", error.message);
    }
    setLoading(false);
  };

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome: name || email } },
    });
    if (error) {
      setLoading(false);
      toastError("Erro ao criar conta", error.message ?? "Tente novamente");
      return;
    }
    const userId = data.user?.id;
    if (data.session && userId) {
      await loadProfile(userId);
    }
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
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
