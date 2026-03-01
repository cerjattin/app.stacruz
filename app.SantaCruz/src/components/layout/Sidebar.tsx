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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-food-wine text-food-cream md:block">
      <div className="flex h-full flex-col">
        <div className="px-4 py-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold tracking-wide">Comandas</div>
              <span className="rounded-full bg-food-mustard px-2 py-0.5 text-[10px] font-extrabold text-black">
                KITCHEN
              </span>
            </div>
            <div className="mt-1 text-xs text-white/70">Zeus / SIESA</div>
          </div>
        </div>

        <nav className="flex-1 px-2">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "mb-1 block rounded-xl px-3 py-2 text-sm font-semibold transition",
                  isActive
                    ? "bg-food-mustard text-black shadow-sm"
                    : "text-white/90 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
              end
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {state.status === "authenticated" && (
          <div className="border-t border-white/10 px-4 py-4">
            <div className="text-xs text-white/70">Sesión</div>
            <div className="mt-1 text-sm font-semibold text-white">{state.user.name}</div>
            <div className="text-xs text-white/80">{state.user.role}</div>
          </div>
        )}
      </div>
    </aside>
  );
}