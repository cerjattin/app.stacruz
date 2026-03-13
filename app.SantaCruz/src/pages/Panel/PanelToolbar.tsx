import { useMemo } from "react";
import type { TicketStatus } from "../../lib/types";

export type TicketSortMode = "PRIORITY" | "RECENT" | "MESA";
export type PanelViewMode = "CARDS" | "MESA";

type Props = {
  onlyActive: boolean;
  onToggleOnlyActive: (v: boolean) => void;
  query: string;
  onQuery: (v: string) => void;
  status: TicketStatus | "ALL";
  onStatus: (v: TicketStatus | "ALL") => void;
  soundEnabled: boolean;
  onSoundEnabled: (v: boolean) => void;
  sortMode: TicketSortMode;
  onSortMode: (v: TicketSortMode) => void;
  viewMode: PanelViewMode;
  onViewMode: (v: PanelViewMode) => void;
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
  sortMode,
  onSortMode,
  viewMode,
  onViewMode,
}: Props) {
  const statuses = useMemo(
    () =>
      [
        "ALL",
        "PENDIENTE",
        "EN_PREPARACION",
        "PARCIAL",
        "LISTO",
        "CANCELADO",
      ] as const,
    [],
  );

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-food-cream px-3 py-2 text-sm font-bold text-stone-800">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => onToggleOnlyActive(e.target.checked)}
            />
            Solo activos
          </label>

          <select
            value={status}
            onChange={(e) => onStatus(e.target.value as TicketStatus | "ALL")}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-800"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "Todos" : s}
              </option>
            ))}
          </select>

          <select
            value={sortMode}
            onChange={(e) => onSortMode(e.target.value as TicketSortMode)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-800"
          >
            <option value="PRIORITY">Orden: prioridad</option>
            <option value="RECENT">Orden: más recientes</option>
            <option value="MESA">Orden: mesa</option>
          </select>

          <div className="inline-flex overflow-hidden rounded-xl border border-stone-200">
            <button
              onClick={() => onViewMode("CARDS")}
              className={[
                "px-3 py-2 text-sm font-extrabold",
                viewMode === "CARDS"
                  ? "bg-food-wine text-white"
                  : "bg-white text-stone-800 hover:bg-stone-50",
              ].join(" ")}
            >
              Tarjetas
            </button>
            <button
              onClick={() => onViewMode("MESA")}
              className={[
                "px-3 py-2 text-sm font-extrabold",
                viewMode === "MESA"
                  ? "bg-food-wine text-white"
                  : "bg-white text-stone-800 hover:bg-stone-50",
              ].join(" ")}
            >
              Despacho por mesa
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar mesa, mesero, pedido, comanda…"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-900 placeholder:text-stone-400 sm:w-80"
          />

          <label className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-800">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => onSoundEnabled(e.target.checked)}
            />
            Sonido
          </label>
        </div>
      </div>
    </div>
  );
}
