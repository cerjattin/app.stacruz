import { useMemo, useState } from "react";

import type { TicketStatus } from "../../lib/types";
import { FiltersBar } from "../../components/FiltersBar";
import { SyncButton } from "../../components/SyncButton";
import { TicketGrid } from "../../components/TicketGrid";
import { TicketDetailModal } from "../../components/TicketDetailModal";
import { useTickets } from "../../hooks/useTickets";
import { useTicketDetail } from "../../hooks/useTicketDetail";
import * as ticketsService from "../../services/ticketsService";
import { useAuth } from "../../context/AuthContext";

export function PanelPage() {
  const { state } = useAuth();
  const role = state.status === "authenticated" ? state.user.role : "OPERARIO";

  const [filters, setFilters] = useState<{ status: TicketStatus | ""; q: string }>({ status: "", q: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: tickets, isLoading, isError, error, refetch } = useTickets({
    status: filters.status ? (filters.status as TicketStatus) : undefined,
    q: filters.q,
  });

  const detail = useTicketDetail(selectedId);

  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const stats = useMemo(() => {
    const list = tickets ?? [];
    const by = (s: TicketStatus) => list.filter((t) => t.status === s).length;
    return {
      total: list.length,
      pendiente: by("PENDIENTE"),
      prep: by("EN_PREPARACION"),
      parcial: by("PARCIAL"),
      listo: by("LISTO"),
    };
  }, [tickets]);

  async function onSync() {
    setSyncMsg(null);
    setSyncBusy(true);
    try {
      const res = await ticketsService.runSync();
      setSyncMsg(`Sync OK · nuevos: ${res.new_tickets} · actualizados: ${res.updated_tickets}`);
      await refetch();
    } catch (err: any) {
      setSyncMsg(err?.message || "No fue posible sincronizar");
    } finally {
      setSyncBusy(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Resumen</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <Badge label="Total" value={stats.total} />
            <Badge label="Pend." value={stats.pendiente} />
            <Badge label="Prep." value={stats.prep} />
            <Badge label="Parcial" value={stats.parcial} />
            <Badge label="Listo" value={stats.listo} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:block">
            Rol: <span className="font-semibold text-slate-900">{role}</span>
          </div>
          {/* Puedes restringir la sincronización solo a ADMIN si deseas */}
          <SyncButton busy={syncBusy} onClick={onSync} />
        </div>
      </div>

      {syncMsg && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">{syncMsg}</div>
      )}

      <FiltersBar status={filters.status} q={filters.q} onChange={setFilters} />

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Cargando…</div>
      )}
      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
          {String((error as any)?.message || "Error cargando comandas")}
        </div>
      )}

      {!isLoading && !isError && <TicketGrid tickets={tickets ?? []} onOpenTicket={(id) => setSelectedId(id)} />}

      <TicketDetailModal
        open={Boolean(selectedId)}
        ticket={detail.data ?? null}
        onClose={() => setSelectedId(null)}
        onRefresh={() => {
          detail.refetch();
          refetch();
        }}
      />
    </div>
  );
}

function Badge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
      <span className="text-slate-500">{label}</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-slate-900 shadow-sm">{value}</span>
    </span>
  );
}
