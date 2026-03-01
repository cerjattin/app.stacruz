import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function titleFromPath(pathname: string): string {
  if (pathname.startsWith("/panel")) return "Panel de Comandas";
  if (pathname.startsWith("/admin/sync")) return "Sincronización";
  if (pathname.startsWith("/admin/users")) return "Usuarios";
  if (pathname.startsWith("/admin/settings")) return "Configuración";
  if (pathname.startsWith("/tickets")) return "Detalle de Comanda";
  return "Comandas";
}

export function Topbar() {
  const { state, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const title = useMemo(() => titleFromPath(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-food-cream backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold tracking-wide text-food-wine sm:text-lg">
            {title}
          </h1>
          <p className="mt-0.5 text-xs text-stone-600">
            Actualización cada 5 min · Manual disponible
          </p>
        </div>

        <div className="flex items-center gap-3">
          {state.status === "authenticated" && (
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-stone-900">
                {state.user.name}
              </div>
              <div className="text-xs text-stone-600">
                {state.user.role}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="rounded-xl bg-food-mustard px-4 py-2 text-sm font-bold text-black shadow-sm transition hover:brightness-95"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}