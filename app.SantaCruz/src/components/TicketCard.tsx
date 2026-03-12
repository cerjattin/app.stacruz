import type { TicketCard as TicketCardType } from "../lib/types";
import { formatTime } from "../lib/status";
import { StatusPill } from "./StatusPill";
import { AgeBadge } from "./AgeBadge";
import { ageTone, minutesSince } from "../lib/time";
import { ticketTone } from "../lib/themeFood";

type Props = {
  ticket: TicketCardType;
  onOpen: () => void;
  isFresh?: boolean;
};

export function TicketCard({ ticket, onOpen, isFresh = false }: Props) {
  const mins = minutesSince(ticket.hora_pedido);
  const tone = ageTone(mins);
  const ui = ticketTone(ticket.status);

  const pulse =
    (ticket.status === "PENDIENTE" ||
      ticket.status === "EN_PREPARACION" ||
      ticket.status === "PARCIAL") &&
    tone === "danger"
      ? "animate-pulse"
      : "";

  const freshRing = isFresh ? "ring-2 ring-food-mustard/70" : "";

  return (
    <button
      onClick={onOpen}
      className={[
        "rounded-2xl border border-stone-200 border-l-8 p-4 text-left shadow-sm transition hover:shadow-md",
        "bg-white",
        ui.border,
        pulse,
        freshRing,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-stone-500">Mesa</div>
          <div className="text-2xl font-extrabold text-stone-900">
            #{ticket.mesa_ref ?? "—"}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {isFresh && (
            <span className="rounded-full bg-food-mustard px-2 py-1 text-[10px] font-black uppercase tracking-wide text-black">
              Nueva
            </span>
          )}
          <StatusPill kind="ticket" status={ticket.status} />
          <AgeBadge minutes={mins} tone={tone} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-stone-500">Mesero</div>
          <div className="font-bold text-stone-900">
            {ticket.mesero_nombre ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-stone-500">Hora pedido</div>
          <div className="font-bold text-stone-900">
            {formatTime(ticket.hora_pedido)}
          </div>
        </div>

        <div>
          <div className="text-stone-500">No. Pedido</div>
          <div className="font-bold text-stone-900">
            {ticket.pos_consec_docto ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-stone-500">No. Comanda</div>
          <div className="font-bold text-stone-900">
            {ticket.comanda_number ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-stone-500">Prep.</div>
          <div className="font-bold text-stone-800">
            {formatTime(ticket.hora_preparacion)}
          </div>
        </div>
        <div>
          <div className="text-stone-500">Entrega</div>
          <div className="font-bold text-stone-800">
            {formatTime(ticket.hora_entrega)}
          </div>
        </div>
      </div>
    </button>
  );
}
