import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type LocState = { from?: string };

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as LocState | null)?.from ?? "/panel";
  const isMock = (import.meta.env.VITE_AUTH_MODE || "api").toLowerCase() === "mock";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => username.trim().length > 0 && password.trim().length > 0, [username, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "No fue posible iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "authenticated") {
    navigate("/panel", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-slate-600">Acceso al panel de comandas (Administrador / Operario)</p>
          </div>

          {isMock && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold">Modo demo (mock)</div>
              <div className="mt-1">
                <div className="font-mono text-xs">admin / admin123</div>
                <div className="font-mono text-xs">operario / oper123</div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Usuario</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="admin / operario"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Contraseña</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className={[
                "w-full rounded-xl px-4 py-2 text-sm font-semibold shadow-sm",
                !canSubmit || busy
                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                  : "bg-slate-900 text-white hover:bg-slate-800",
              ].join(" ")}
            >
              {busy ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} · Comandas Zeus/SIESA
        </p>
      </div>
    </div>
  );
}
