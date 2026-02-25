import type { TicketCard as TicketCardType } from "../lib/types";
import { formatTime } from "../lib/status";
import { StatusPill } from "./StatusPill";
import { AgeBadge } from "./AgeBadge";
import { ageTone, minutesSince } from "../lib/time";

export function TicketCard({ ticket, onOpen }: { ticket: TicketCardType; onOpen: () => void }) {
  const mins = minutesSince(ticket.hora_pedido);
  const tone = ageTone(mins);

  const accent =
    ticket.status === "PENDIENTE"
      ? "border-l-amber-400"
      : ticket.status === "EN_PREPARACION"
        ? "border-l-blue-400"
        : ticket.status === "PARCIAL"
          ? "border-l-violet-400"
          : ticket.status === "LISTO"
            ? "border-l-emerald-400"
            : "border-l-slate-300";

  const pulse =
    (ticket.status === "PENDIENTE" || ticket.status === "EN_PREPARACION" || ticket.status === "PARCIAL") &&
    tone === "crit"
      ? "animate-pulse"
      : "";

  return (
    <button
      onClick={onOpen}
      className={`rounded-2xl border border-slate-200 border-l-8 ${accent} bg-white p-4 text-left shadow-sm transition hover:shadow-md ${pulse}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">Mesa</div>
          <div className="text-2xl font-bold text-slate-900">#{ticket.mesa_ref ?? "—"}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill kind="ticket" status={ticket.status} />
          <AgeBadge hora_pedido={ticket.hora_pedido} status={ticket.status} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-slate-500">Mesero</div>
          <div className="font-semibold text-slate-900">{ticket.mesero_nombre ?? "—"}</div>
        </div>
        <div>
          <div className="text-slate-500">Hora pedido</div>
          <div className="font-semibold text-slate-900">{formatTime(ticket.hora_pedido)}</div>
        </div>

        <div>
          <div className="text-slate-500">No. Pedido</div>
          <div className="font-semibold text-slate-900">{ticket.pos_consec_docto ?? "—"}</div>
        </div>
        <div>
          <div className="text-slate-500">No. Comanda</div>
          <div className="font-semibold text-slate-900">{ticket.comanda_number}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-slate-500">Prep.</div>
          <div className="font-semibold text-slate-800">{formatTime(ticket.hora_preparacion)}</div>
        </div>
        <div>
          <div className="text-slate-500">Entrega</div>
          <div className="font-semibold text-slate-800">{formatTime(ticket.hora_entrega)}</div>
        </div>
      </div>
    </button>
  );
}
