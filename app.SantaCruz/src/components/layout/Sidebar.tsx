import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type NavItem = {
  to: string;
  label: string;
  roles?: Array<"ADMIN" | "OPERARIO">;
};

const NAV: NavItem[] = [
  { to: "/panel", label: "Comandas", roles: ["ADMIN", "OPERARIO"] },
  { to: "/admin/sync", label: "Sincronización", roles: ["ADMIN"] },
  { to: "/admin/users", label: "Usuarios", roles: ["ADMIN"] },
  { to: "/admin/settings", label: "Configuración", roles: ["ADMIN"] },
];

export function Sidebar() {
  const { state } = useAuth();

  const role = state.status === "authenticated" ? state.user.role : null;
  const visible = NAV.filter((n) => !n.roles || (role ? n.roles.includes(role) : false));

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex h-full flex-col">
        <div className="px-4 py-4">
          <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-sm">
            <div className="text-sm font-semibold">Comandas</div>
            <div className="text-xs text-slate-300">Zeus / SIESA</div>
          </div>
        </div>

        <nav className="flex-1 px-2">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "mb-1 block rounded-xl px-3 py-2 text-sm font-semibold",
                  isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
                ].join(" ")
              }
              end
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {state.status === "authenticated" && (
          <div className="border-t border-slate-200 px-4 py-4">
            <div className="text-xs text-slate-500">Sesión</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{state.user.name}</div>
            <div className="text-xs text-slate-600">{state.user.role}</div>
          </div>
        )}
      </div>
    </aside>
  );
}
