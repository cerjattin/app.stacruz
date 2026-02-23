import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Role, User } from "../lib/types";
import { clearAuthStorage, getStoredUser, getToken, setStoredUser, setToken } from "../lib/authStorage";
import * as authService from "../services/authService";

type AuthState =
  | { status: "loading"; user: null; token: null }
  | { status: "anonymous"; user: null; token: null }
  | { status: "authenticated"; user: User; token: string };

type AuthContextValue = {
  state: AuthState;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: Role) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null, token: null });

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (token && user) {
      setState({ status: "authenticated", token, user });
    } else {
      setState({ status: "anonymous", user: null, token: null });
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authService.login(username, password);
    setToken(res.access_token);
    setStoredUser(res.user);
    setState({ status: "authenticated", token: res.access_token, user: res.user });
  };

  const logout = () => {
    clearAuthStorage();
    setState({ status: "anonymous", user: null, token: null });
  };

  const hasRole = (role: Role): boolean => {
    if (state.status !== "authenticated") return false;
    return state.user.role === role;
  };

  const value = useMemo<AuthContextValue>(() => ({ state, login, logout, hasRole }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
