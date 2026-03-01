import { useMemo } from "react";

type TicketStatus = "PENDIENTE" | "EN_PREPARACION" | "PARCIAL" | "LISTO" | "CANCELADO";

type Props = {
  onlyActive: boolean;
  onToggleOnlyActive: (v: boolean) => void;
  query: string;
  onQuery: (v: string) => void;
  status: TicketStatus | "ALL";
  onStatus: (v: TicketStatus | "ALL") => void;
  soundEnabled: boolean;
  onSoundEnabled: (v: boolean) => void;
};

function labelize(s: string) {
  return s === "ALL" ? "Todos" : s.replaceAll("_", " ");
}

export function PanelToolbar({
  onlyActive,
  onToggleOnlyActive,
  query,
  onQuery,
  status,
  onStatus,
  soundEnabled,
  onSoundEnabled,
}: Props) {
  const statuses = useMemo(
    () => ["ALL", "PENDIENTE", "EN_PREPARACION", "PARCIAL", "LISTO", "CANCELADO"] as const,
    []
  );

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl border border-stone-200 bg-white/70 backdrop-blur p-3 shadow-sm">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => onToggleOnlyActive(e.target.checked)}
            className="h-4 w-4 accent-food-wine"
          />
          Solo activos
        </label>

        <select
          value={status}
          onChange={(e) => onStatus(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-stone-200 text-sm bg-food-cream text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-food-mustard"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {labelize(s)}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar mesa, mesero, #comanda…"
          className="px-3 py-2 rounded-xl border border-stone-200 text-sm w-72 bg-white text-stone-900 font-semibold placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-food-mustard"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={(e) => onSoundEnabled(e.target.checked)}
          className="h-4 w-4 accent-food-mustard"
        />
        Sonido nuevas comandas
      </label>
    </div>
  );
}