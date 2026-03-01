import type { TicketStatus, ItemStatus } from "../lib/types";
import { ticketTone, itemTone } from "../lib/themeFood";

function labelize(s: string) {
  return s.replaceAll("_", " ");
}

export function StatusPill({
  kind,
  status,
}: {
  kind: "ticket" | "item";
  status: TicketStatus | ItemStatus;
}) {
  if (kind === "ticket") {
    const ui = ticketTone(status as TicketStatus);
    return (
      <span className={`px-3 py-1 text-[11px] rounded-full font-extrabold tracking-wide ${ui.pill}`}>
        {labelize(String(status))}
      </span>
    );
  }

  const cls = itemTone(status as ItemStatus);
  return (
    <span className={`px-2 py-1 text-[11px] rounded-full font-extrabold tracking-wide ${cls}`}>
      {labelize(String(status))}
    </span>
  );
}