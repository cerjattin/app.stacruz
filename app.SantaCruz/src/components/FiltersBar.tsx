import type { TicketStatus } from "../lib/types";

export function FiltersBar({
  status,
  q,
  onChange,
}: {
  status: TicketStatus | "";
  q: string;
  onChange: (next: { status: TicketStatus | ""; q: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
      <div className="w-full sm:w-60">
        <label className="mb-1 block text-xs font-semibold text-slate-600">Estado</label>
        <select
          value={status}
          onChange={(e) => onChange({ status: e.target.value as TicketStatus | "", q })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
        >
          <option value="">Todos</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_PREPARACION">En preparación</option>
          <option value="PARCIAL">Parcial</option>
          <option value="LISTO">Listo</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <div className="flex-1">
        <label className="mb-1 block text-xs font-semibold text-slate-600">Buscar</label>
        <input
          value={q}
          onChange={(e) => onChange({ status, q: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          placeholder="Mesa, mesero, no. pedido o comanda"
        />
      </div>
    </div>
  );
}
