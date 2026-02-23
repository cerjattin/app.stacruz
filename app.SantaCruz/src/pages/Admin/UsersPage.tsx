import { useMemo, useState } from "react";
import type { Role, User } from "../../lib/types";

export function UsersPage() {
  // UI lista para backend. En modo demo se mantiene en memoria.
  const [users, setUsers] = useState<User[]>([
    { username: "admin", name: "Administrador", role: "ADMIN" },
    { username: "operario", name: "Operario", role: "OPERARIO" },
  ]);

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("OPERARIO");

  const canAdd = useMemo(() => username.trim() && name.trim(), [username, name]);

  function addUser() {
    if (!canAdd) return;
    setUsers((prev) => [...prev, { username: username.trim(), name: name.trim(), role }]);
    setUsername("");
    setName("");
    setRole("OPERARIO");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Gestión de usuarios</h2>
        <p className="mt-1 text-sm text-slate-600">
          Administra accesos al panel. Cuando el backend esté listo, esta pantalla consumirá endpoints de /admin/users.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="jlopez"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="Juan Lopez"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400"
            >
              <option value="OPERARIO">OPERARIO</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={addUser}
              disabled={!canAdd}
              className={[
                "w-full rounded-xl px-4 py-2 text-sm font-semibold shadow-sm",
                canAdd ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500 cursor-not-allowed",
              ].join(" ")}
            >
              Crear usuario
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-600">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} className="border-t border-slate-200">
                <td className="px-4 py-3 font-semibold text-slate-900">{u.username}</td>
                <td className="px-4 py-3 text-slate-700">{u.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">{u.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
