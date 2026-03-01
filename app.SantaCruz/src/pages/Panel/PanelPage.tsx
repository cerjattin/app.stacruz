import { useEffect, useMemo, useRef, useState } from "react";

import type { TicketStatus } from "../../lib/types";
import { SyncButton } from "../../components/SyncButton";
import { TicketGrid } from "../../components/TicketGrid";
import { TicketDetailModal } from "../../components/TicketDetailModal";
import { useTickets } from "../../hooks/useTickets";
import { useTicketDetail } from "../../hooks/useTicketDetail";
import * as ticketsService from "../../services/ticketsService";
import { useAuth } from "../../context/AuthContext";
import { playNewTicketBeep } from "../../lib/sound";
import { PanelToolbar } from "./PanelToolbar";

type StatusFilter = "ALL" | TicketStatus;

export function PanelPage() {
  const { state } = useAuth();
  const role = state.status === "authenticated" ? state.user.role : "OPERARIO";

  const [onlyActive, setOnlyActive] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const v = localStorage.getItem("kitchen_sound_enabled");
    return v ? v === "1" : true;
  });

  useEffect(() => {
    localStorage.setItem("kitchen_sound_enabled", soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  const effectiveFilters = useMemo(() => {
    let status: TicketStatus | "" = "";
    if (statusFilter !== "ALL") status = statusFilter;
    return { status, q: query };
  }, [query, statusFilter]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: ticketsRaw, isLoading, isError, error, refetch } = useTickets({
    status: effectiveFilters.status ? (effectiveFilters.status as TicketStatus) : undefined,
    q: effectiveFilters.q,
  });

  const tickets = useMemo(() => {
    const list = ticketsRaw ?? [];
    if (!onlyActive) return list;

    const active = new Set<TicketStatus>(["PENDIENTE", "EN_PREPARACION", "PARCIAL"]);
    return list.filter((t) => active.has(t.status));
  }, [ticketsRaw, onlyActive]);

  // 🔔 Beep cuando llega una comanda nueva
  const seenIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!tickets || tickets.length === 0) return;

    if (seenIds.current.size === 0) {
      tickets.forEach((t) => seenIds.current.add(t.id));
      return;
    }

    const fresh = tickets.filter((t) => !seenIds.current.has(t.id));
    if (fresh.length > 0) {
      fresh.forEach((t) => seenIds.current.add(t.id));
      if (soundEnabled) void playNewTicketBeep();
    }
  }, [tickets, soundEnabled]);

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
      <PanelToolbar
        onlyActive={onlyActive}
        onToggleOnlyActive={setOnlyActive}
        query={query}
        onQuery={setQuery}
        status={statusFilter}
        onStatus={setStatusFilter}
        soundEnabled={soundEnabled}
        onSoundEnabled={setSoundEnabled}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Resumen */}
        <div className="rounded-2xl border border-stone-200 bg-white/70 backdrop-blur p-4 shadow-sm">
          <div className="text-xs font-extrabold tracking-wide text-food-wine">Resumen</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <Badge label="Total" value={stats.total} />
            <Badge label="Pend." value={stats.pendiente} />
            <Badge label="Prep." value={stats.prep} />
            <Badge label="Parcial" value={stats.parcial} />
            <Badge label="Listo" value={stats.listo} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-stone-200 bg-white/70 backdrop-blur px-4 py-3 text-sm text-stone-700 shadow-sm sm:block">
            Rol: <span className="font-extrabold text-food-wine">{role}</span>
          </div>

          {role === "ADMIN" && <SyncButton busy={syncBusy} onClick={onSync} />}
        </div>
      </div>

      {syncMsg && (
        <div className="rounded-2xl border border-stone-200 bg-white/70 backdrop-blur p-4 text-sm text-stone-800 shadow-sm">
          {syncMsg}
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl border border-stone-200 bg-white/70 backdrop-blur p-6 text-sm text-stone-700 shadow-sm">
          Cargando…
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-950">
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
    <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800">
      <span className="text-stone-600">{label}</span>
      <span className="rounded-full bg-white px-2 py-0.5 font-extrabold text-food-wine shadow-sm">{value}</span>
    </span>
  );
}