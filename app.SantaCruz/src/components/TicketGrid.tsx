import type { TicketCard as TicketCardType } from "../lib/types";
import { TicketCard } from "./TicketCard";

type Props = {
  tickets: TicketCardType[];
  onOpenTicket: (id: string) => void;
  freshIds?: Set<string>;
};

export function TicketGrid({ tickets, onOpenTicket, freshIds }: Props) {
  if (!tickets.length) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-600 shadow-sm">
        No hay comandas para mostrar con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onOpen={() => onOpenTicket(ticket.id)}
          isFresh={Boolean(freshIds?.has(ticket.id))}
        />
      ))}
    </div>
  );
}
