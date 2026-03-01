import type { TicketEvent } from "../hooks/useTicketEvents";

function fmtDT(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function dotKind(eventType: string) {
  const t = (eventType || "").toUpperCase();
  if (t.includes("ERROR")) return "bg-red-500";
  if (t.includes("CANCEL")) return "bg-red-500";
  if (t.includes("REPLACE")) return "bg-food-orange";
  if (t.includes("STATUS")) return "bg-food-mustard";
  if (t.includes("PRINT")) return "bg-food-olive";
  return "bg-stone-400";
}

export function TicketEventsTimeline({ events }: { events: TicketEvent[] }) {
  if (!events.length) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-sm">
        Aún no hay eventos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((ev) => (
        <div
          key={ev.id}
          className="rounded-2xl border border-stone-200 bg-white/70 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center">
              <span
                className={`h-2.5 w-2.5 rounded-full ${dotKind(ev.event_type)}`}
              />
              <span className="mt-2 h-full w-px bg-stone-200" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-stone-900">
                {ev.message}
              </div>
              <div className="mt-1 text-xs text-stone-600">
                {fmtDT(ev.created_at)} · {ev.user_name ?? "Sistema"} ·{" "}
                <span className="font-bold text-stone-800">
                  {ev.event_type}
                </span>
                {ev.item_id ? " · item" : ""}
              </div>

              {ev.meta ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-extrabold text-stone-600 hover:text-stone-900">
                    Ver detalles
                  </summary>
                  <pre className="mt-2 overflow-auto rounded-xl bg-stone-900 p-3 text-[11px] text-stone-100">
                    {JSON.stringify(ev.meta, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
