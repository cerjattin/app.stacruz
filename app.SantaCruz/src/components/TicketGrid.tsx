import type { TicketCard as TicketCardType } from "../lib/types";
import { TicketCard } from "./TicketCard";

export function TicketGrid({ tickets, onOpenTicket }: { tickets: TicketCardType[]; onOpenTicket: (id: string) => void }) {
  if (!tickets.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No hay comandas para mostrar.
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} onOpen={() => onOpenTicket(t.id)} />
      ))}
    </section>
  );
}
