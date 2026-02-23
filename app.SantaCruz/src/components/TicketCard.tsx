import type { TicketCard as TicketCardType } from "../lib/types";
import { formatTime } from "../lib/status";
import { StatusPill } from "./StatusPill";

export function TicketCard({ ticket, onOpen }: { ticket: TicketCardType; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">Mesa</div>
          <div className="text-2xl font-bold text-slate-900">#{ticket.mesa_ref ?? "—"}</div>
        </div>
        <StatusPill kind="ticket" status={ticket.status} />
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
