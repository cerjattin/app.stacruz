import type { TicketCard, TicketStatus } from "../lib/types";
import { minutesSince } from "../lib/time";
import { StatusPill } from "./StatusPill";

type MesaGroup = {
  mesaRef: string;
  tickets: TicketCard[];
  total: number;
  pendientes: number;
  enPreparacion: number;
  parciales: number;
  listos: number;
  cancelados: number;
  oldestMinutes: number;
};

type Props = {
  tickets: TicketCard[];
  onOpenTicket: (id: string) => void;
};

function buildGroups(tickets: TicketCard[]): MesaGroup[] {
  const map = new Map<string, TicketCard[]>();

  for (const ticket of tickets) {
    const key = (ticket.mesa_ref ?? "SIN MESA").toString().trim() || "SIN MESA";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ticket);
  }

  const groups: MesaGroup[] = [];

  for (const [mesaRef, list] of map.entries()) {
    const by = (s: TicketStatus) => list.filter((t) => t.status === s).length;
    const oldestMinutes = Math.max(
      ...list.map((t) => minutesSince(t.hora_pedido)),
    );

    groups.push({
      mesaRef,
      tickets: list.sort(
        (a, b) => minutesSince(b.hora_pedido) - minutesSince(a.hora_pedido),
      ),
      total: list.length,
      pendientes: by("PENDIENTE"),
      enPreparacion: by("EN_PREPARACION"),
      parciales: by("PARCIAL"),
      listos: by("LISTO"),
      cancelados: by("CANCELADO"),
      oldestMinutes,
    });
  }

  groups.sort((a, b) => {
    const aPriority =
      (a.listos > 0 ? 300 : 0) +
      (a.parciales > 0 ? 200 : 0) +
      (a.pendientes > 0 ? 100 : 0) +
      a.oldestMinutes;
    const bPriority =
      (b.listos > 0 ? 300 : 0) +
      (b.parciales > 0 ? 200 : 0) +
      (b.pendientes > 0 ? 100 : 0) +
      b.oldestMinutes;
    if (bPriority !== aPriority) return bPriority - aPriority;
    return a.mesaRef.localeCompare(b.mesaRef, "es", {
      numeric: true,
      sensitivity: "base",
    });
  });

  return groups;
}

export function MesaDispatchBoard({ tickets, onOpenTicket }: Props) {
  const groups = buildGroups(tickets);
  const readyGroups = groups.filter((g) => g.listos > 0);

  if (!groups.length) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-600 shadow-sm">
        No hay mesas para mostrar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <div className="text-sm font-extrabold tracking-wide text-food-wine">
            Cola de salida
          </div>
          <div className="mt-1 text-sm text-stone-600">
            Mesas con al menos una comanda en estado{" "}
            <span className="font-bold">LISTO</span>.
          </div>
        </div>

        {readyGroups.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            No hay mesas listas para entregar en este momento.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {readyGroups.map((group) => (
              <button
                key={`ready-${group.mesaRef}`}
                onClick={() => onOpenTicket(group.tickets[0].id)}
                className="rounded-2xl border border-lime-200 bg-lime-50 p-4 text-left shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-extrabold tracking-wide text-lime-700">
                      Mesa
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-lime-950">
                      #{group.mesaRef}
                    </div>
                  </div>
                  <div className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black text-lime-900">
                    {group.listos} listo{group.listos === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mt-3 text-sm text-lime-900">
                  Total tickets:{" "}
                  <span className="font-bold">{group.total}</span>
                </div>
                <div className="text-sm text-lime-900">
                  Antigüedad máx.:{" "}
                  <span className="font-bold">{group.oldestMinutes} min</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.mesaRef}
            className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-extrabold tracking-wide text-stone-500">
                  Mesa
                </div>
                <div className="mt-1 text-3xl font-extrabold text-stone-900">
                  #{group.mesaRef}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <MiniBadge label="Total" value={group.total} />
                <MiniBadge label="Pend." value={group.pendientes} />
                <MiniBadge label="Prep." value={group.enPreparacion} />
                <MiniBadge label="Parcial" value={group.parciales} />
                <MiniBadge
                  label="Listo"
                  value={group.listos}
                  accent="success"
                />
                <MiniBadge
                  label="Máx."
                  value={`${group.oldestMinutes} min`}
                  accent="warn"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-stone-500">
                    <th className="px-3 py-2">Comanda</th>
                    <th className="px-3 py-2">Pedido</th>
                    <th className="px-3 py-2">Mesero</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Antigüedad</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {group.tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-stone-100">
                      <td className="px-3 py-3 font-bold text-stone-900">
                        #{ticket.comanda_number ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-stone-800">
                        {ticket.pos_consec_docto ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-stone-800">
                        {ticket.mesero_nombre ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill kind="ticket" status={ticket.status} />
                      </td>
                      <td className="px-3 py-3 text-stone-800">
                        {minutesSince(ticket.hora_pedido)} min
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => onOpenTicket(ticket.id)}
                          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-extrabold text-stone-800 hover:bg-stone-50"
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function MiniBadge({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string | number;
  accent?: "default" | "success" | "warn";
}) {
  const cls =
    accent === "success"
      ? "bg-lime-100 text-lime-900"
      : accent === "warn"
        ? "bg-amber-100 text-amber-900"
        : "bg-stone-100 text-stone-800";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </span>
  );
}
