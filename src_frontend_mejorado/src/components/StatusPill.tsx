import type { ItemStatus, TicketStatus } from "../lib/types";
import { itemStatusPillClass, statusLabel, ticketStatusPillClass } from "../lib/status";

export function StatusPill({
  kind,
  status,
}: {
  kind: "ticket" | "item";
  status: TicketStatus | ItemStatus;
}) {
  const cls = kind === "ticket" ? ticketStatusPillClass(status as TicketStatus) : itemStatusPillClass(status as ItemStatus);
  return <span className={cls}>{statusLabel(status)}</span>;
}
