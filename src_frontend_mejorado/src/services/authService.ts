import { api } from "../lib/api";
import type { LoginResponse } from "../lib/types";
import { mockLogin } from "../mocks/auth";

const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE || "api").toLowerCase();

export async function login(username: string, password: string): Promise<LoginResponse> {
  if (AUTH_MODE === "mock") {
    return mockLogin(username, password);
  }

  const res = await api.post<LoginResponse>("/auth/login", { username, password });
  return res.data;
}
