import type { LoginResponse, Role, User } from "../lib/types";

// Credenciales de desarrollo (solo para VITE_AUTH_MODE=mock)
// admin / admin123  -> ADMIN
// operario / oper123 -> OPERARIO

function buildToken(role: Role): string {
  // token ficticio; el backend real debe devolver JWT
  return `mock.${role}.${Date.now()}`;
}

export async function mockLogin(username: string, password: string): Promise<LoginResponse> {
  await new Promise((r) => setTimeout(r, 400));

  const users: Record<string, { password: string; user: User }> = {
    admin: { password: "admin123", user: { username: "admin", name: "Administrador", role: "ADMIN" } },
    operario: { password: "oper123", user: { username: "operario", name: "Operario", role: "OPERARIO" } },
  };

  const entry = users[username];
  if (!entry || entry.password !== password) {
    throw new Error("Credenciales inválidas");
  }

  return {
    access_token: buildToken(entry.user.role),
    user: entry.user,
  };
}
