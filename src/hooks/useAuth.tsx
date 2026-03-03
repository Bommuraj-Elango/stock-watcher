import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import {
  authApi,
  clearToken,
  setToken,
  type AppRole,
  type AppUser,
  type AuthProfile,
} from "@/lib/api";


interface AuthContextType {
  user: AppUser | null;
  role: AppRole | null;
  loading: boolean;
  profile: AuthProfile | null;
  signUp: (email: string, password: string, fullName: string, role: AppRole, extra?: { industry?: string; description?: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        setUser(data.user);
        setRole(data.role);
        setProfile(data.profile);
      })
      .catch(() => {
        clearToken();
        setUser(null);
        setRole(null);
        setProfile(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole, extra?: { industry?: string; description?: string }) => {
    const data = await authApi.signUp({
      email,
      password,
      fullName,
      role,
      industry: extra?.industry || "",
      description: extra?.description || "",
    });
    setToken(data.token);
    setUser(data.user);
    setRole(data.role);
    setProfile(data.profile);
  };

  const signIn = async (email: string, password: string) => {
    const data = await authApi.signIn({ email, password });
    setToken(data.token);
    setUser(data.user);
    setRole(data.role);
    setProfile(data.profile);
  };

  const signOut = async () => {
    clearToken();
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, profile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
