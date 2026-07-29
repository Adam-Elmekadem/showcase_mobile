import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, ApiError, ApiUser, getToken, setToken } from "@/lib/api";

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; username: string; email: string; password: string; password_confirmation: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: ApiUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.me();
      setUser(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await setToken(null);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user, token } = await api.login({ email, password });
    await setToken(token);
    setUser(user);
  }, []);

  const register = useCallback(
    async (data: { name: string; username: string; email: string; password: string; password_confirmation: string }) => {
      const { user, token } = await api.register(data);
      await setToken(token);
      setUser(user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // token likely already invalid; clear locally regardless
    }
    await setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
