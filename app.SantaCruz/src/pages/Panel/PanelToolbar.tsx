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
  const statuses = useMemo(() => ["ALL", "PENDIENTE", "EN_PREPARACION", "PARCIAL", "LISTO", "CANCELADO"] as const, []);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white/60 dark:bg-slate-900/40 backdrop-blur rounded-xl p-3 border">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => onToggleOnlyActive(e.target.checked)}
          />
          Solo activos
        </label>

        <select
          value={status}
          onChange={(e) => onStatus(e.target.value as any)}
          className="px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-950"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "Todos" : s}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar mesa, mesero, #comanda…"
          className="px-3 py-2 rounded-lg border text-sm w-64 bg-white dark:bg-slate-950"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={(e) => onSoundEnabled(e.target.checked)}
        />
        Sonido nuevas comandas
      </label>
    </div>
  );
}