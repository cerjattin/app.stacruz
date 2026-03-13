import { useEffect, useMemo, useRef, useState } from "react";

import type { TicketCard, TicketStatus } from "../../lib/types";
import { SyncButton } from "../../components/SyncButton";
import { TicketGrid } from "../../components/TicketGrid";
import { TicketDetailModal } from "../../components/TicketDetailModal";
import { MesaDispatchBoard } from "../../components/MesaDispatchBoard";
import { useTickets } from "../../hooks/useTickets";
import { useTicketDetail } from "../../hooks/useTicketDetail";
import * as ticketsService from "../../services/ticketsService";
import { useAuth } from "../../context/AuthContext";
import { playNewTicketBeep } from "../../lib/sound";
import { compareTicketPriority, parseDate } from "../../lib/time";
import {
  PanelToolbar,
  type PanelViewMode,
  type TicketSortMode,
} from "./PanelToolbar";

type StatusFilter = "ALL" | TicketStatus;

export function PanelPage() {
  const { state } = useAuth();
  const role = state.status === "authenticated" ? state.user.role : "OPERARIO";

  const [onlyActive, setOnlyActive] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortMode, setSortMode] = useState<TicketSortMode>("PRIORITY");
  const [viewMode, setViewMode] = useState<PanelViewMode>("CARDS");

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const v = localStorage.getItem("kitchen_sound_enabled");
    return v ? v === "1" : true;
  });

  useEffect(() => {
    localStorage.setItem("kitchen_sound_enabled", soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  const effectiveFilters = useMemo(() => {
    let status: TicketStatus | undefined;

    if (statusFilter !== "ALL") {
      status = statusFilter;
    }

    return {
      status,
      q: query.trim(),
    };
  }, [statusFilter, query]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data: ticketsRaw,
    isLoading,
    isError,
    error,
    refetch,
  } = useTickets({
    status: effectiveFilters.status,
    q: effectiveFilters.q,
  });

  const seenIds = useRef<Set<string>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const tickets = useMemo(() => {
    const list = (ticketsRaw ?? []).slice();

    let filtered = list;

    if (onlyActive) {
      const active = new Set<TicketStatus>([
        "PENDIENTE",
        "EN_PREPARACION",
        "PARCIAL",
        "LISTO",
      ]);
      filtered = filtered.filter((t) => active.has(t.status));
    }

    if (sortMode === "PRIORITY") {
      filtered.sort(compareTicketPriority);
    } else if (sortMode === "RECENT") {
      filtered.sort((a, b) => {
        const da = parseDate(a.hora_pedido)?.getTime() ?? 0;
        const db = parseDate(b.hora_pedido)?.getTime() ?? 0;
        return db - da;
      });
    } else if (sortMode === "MESA") {
      filtered.sort((a, b) =>
        (a.mesa_ref ?? "").localeCompare(b.mesa_ref ?? "", "es", {
          numeric: true,
          sensitivity: "base",
        }),
      );
    }

    return filtered;
  }, [ticketsRaw, onlyActive, sortMode]);

  useEffect(() => {
    if (!tickets.length) return;

    if (seenIds.current.size === 0) {
      tickets.forEach((t) => seenIds.current.add(t.id));
      return;
    }

    const newIds = tickets
      .filter((t) => !seenIds.current.has(t.id))
      .map((t) => t.id);

    if (newIds.length > 0) {
      const nextFresh = new Set(freshIds);
      newIds.forEach((id) => {
        seenIds.current.add(id);
        nextFresh.add(id);
      });
      setFreshIds(nextFresh);

      if (soundEnabled) void playNewTicketBeep();

      window.setTimeout(() => {
        setFreshIds((prev) => {
          const clone = new Set(prev);
          newIds.forEach((id) => clone.delete(id));
          return clone;
        });
      }, 180000);
    }
  }, [tickets, soundEnabled, freshIds]);

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

  const urgentCount = useMemo(() => {
    return tickets.filter((t) => {
      const d = parseDate(t.hora_pedido);
      if (!d) return false;
      const mins = Math.floor((Date.now() - d.getTime()) / 60000);
      return mins >= 25 && t.status !== "LISTO" && t.status !== "CANCELADO";
    }).length;
  }, [tickets]);

  const readyToDispatchCount = useMemo(
    () => tickets.filter((t) => t.status === "LISTO").length,
    [tickets],
  );

  async function onSync() {
    setSyncMsg(null);
    setSyncBusy(true);
    try {
      const res = await ticketsService.runSync();
      setSyncMsg(
        `Sync OK · doctos: ${res.total_doctos_sqlserver ?? 0} · nuevos: ${res.new_tickets} · actualizados: ${res.updated_tickets} · items nuevos: ${res.new_items} · items actualizados: ${res.updated_items ?? 0}`,
      );
      await refetch();
    } catch (err: any) {
      setSyncMsg(err?.message || "No fue posible sincronizar");
    } finally {
      setSyncBusy(false);
      setTimeout(() => setSyncMsg(null), 5000);
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
        sortMode={sortMode}
        onSortMode={setSortMode}
        viewMode={viewMode}
        onViewMode={setViewMode}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total visibles" value={stats.total} />
        <StatCard label="Pendientes" value={stats.pendiente} />
        <StatCard label="En preparación" value={stats.prep} />
        <StatCard label="Urgentes" value={urgentCount} accent="danger" />
        <StatCard
          label="Listas para entregar"
          value={readyToDispatchCount}
          accent="success"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-sm">
          Rol: <span className="font-extrabold text-stone-900">{role}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-stone-200 bg-food-cream px-4 py-3 text-sm font-bold text-stone-700 shadow-sm">
            Nuevas detectadas:{" "}
            <span className="text-food-wine">{freshIds.size}</span>
          </div>

          {role === "ADMIN" && <SyncButton busy={syncBusy} onClick={onSync} />}
        </div>
      </div>

      {syncMsg && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700 shadow-sm">
          {syncMsg}
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm">
          Cargando…
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          {String((error as any)?.message || "Error cargando comandas")}
        </div>
      )}

      {!isLoading && !isError && viewMode === "CARDS" && (
        <TicketGrid
          tickets={tickets as TicketCard[]}
          onOpenTicket={(id) => setSelectedId(id)}
          freshIds={freshIds}
        />
      )}

      {!isLoading && !isError && viewMode === "MESA" && (
        <MesaDispatchBoard
          tickets={tickets as TicketCard[]}
          onOpenTicket={(id) => setSelectedId(id)}
        />
      )}

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

function StatCard({
  label,
  value,
  accent = "normal",
}: {
  label: string;
  value: number;
  accent?: "normal" | "danger" | "success";
}) {
  const valueCls =
    accent === "danger"
      ? "text-red-900"
      : accent === "success"
        ? "text-lime-900"
        : "text-stone-900";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-extrabold tracking-wide text-stone-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-extrabold ${valueCls}`}>{value}</div>
    </div>
  );
}
