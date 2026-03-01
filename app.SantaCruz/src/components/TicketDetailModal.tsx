import { useMemo, useState } from "react";
import type { ItemStatus, TicketDetail } from "../lib/types";
import { formatTime } from "../lib/status";
import { StatusPill } from "./StatusPill";
import * as ticketsService from "../services/ticketsService";
import { useAuth } from "../context/AuthContext";
import { ItemActionModal } from "./ItemActionModal";
import { Toast } from "./UI/Toast";
import { useTicketEvents } from "../hooks/useTicketEvents";
import { TicketEventsTimeline } from "./TicketEventsTimeline";

type ActionMode = "cancel" | "replace";
type Tab = "items" | "events";

export function TicketDetailModal({
  open,
  ticket,
  onClose,
  onRefresh,
}: {
  open: boolean;
  ticket: TicketDetail | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { state } = useAuth();
  const userName = state.status === "authenticated" ? state.user.name : "";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("items");

  // Modal interno cambiar/cancelar
  const [actionOpen, setActionOpen] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>("cancel");
  const [actionItemId, setActionItemId] = useState<string | null>(null);

  // Toasts
  const [toast, setToast] = useState<{
    open: boolean;
    kind: "success" | "error" | "info";
    message: string;
  }>({
    open: false,
    kind: "info",
    message: "",
  });

  const canRender = open && ticket;

  // Auditoría
  const events = useTicketEvents(ticket?.id ?? null);

  const actionItem = useMemo(() => {
    if (!ticket || !actionItemId) return null;
    return ticket.items.find((i) => i.id === actionItemId) ?? null;
  }, [ticket, actionItemId]);

  const actionLabel = useMemo(() => {
    if (!actionItem) return "";
    return `${actionItem.qty} × ${actionItem.product_name}`;
  }, [actionItem]);

  const header = useMemo(() => {
    if (!ticket) return null;
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-stone-600">Mesa</div>
          <div className="text-2xl font-extrabold text-food-wine">
            #{ticket.mesa_ref ?? "—"}
          </div>

          <div className="mt-1 text-sm text-stone-700">
            <span className="font-semibold text-stone-900">Mesero:</span>{" "}
            {ticket.mesero_nombre ?? "—"}
          </div>

          <div className="mt-1 text-sm text-stone-700">
            <span className="font-semibold text-stone-900">Pedido:</span>{" "}
            {ticket.pos_consec_docto ?? "—"} ·{" "}
            <span className="font-semibold text-stone-900">Comanda:</span>{" "}
            {ticket.comanda_number}
          </div>
        </div>

        <div className="text-right">
          <StatusPill kind="ticket" status={ticket.status} />
          <div className="mt-2 text-xs text-stone-600">
            Pedido:{" "}
            <span className="font-semibold text-stone-900">
              {formatTime(ticket.hora_pedido)}
            </span>
          </div>
          <div className="text-xs text-stone-600">
            Prep.:{" "}
            <span className="font-semibold text-stone-900">
              {formatTime(ticket.hora_preparacion)}
            </span>
          </div>
          <div className="text-xs text-stone-600">
            Entrega:{" "}
            <span className="font-semibold text-stone-900">
              {formatTime(ticket.hora_entrega)}
            </span>
          </div>
        </div>
      </div>
    );
  }, [ticket]);

  async function setItemStatus(itemId: string, status: ItemStatus) {
    if (!ticket) return;
    setError(null);
    setBusy(true);
    try {
      await ticketsService.updateItemStatus({
        ticketId: ticket.id,
        itemId,
        status,
        user_name: userName || "Operario",
      });

      setToast({
        open: true,
        kind: "success",
        message: "Estado actualizado ✅",
      });
      onRefresh();
      void events.refetch();
    } catch (err: any) {
      setError(err?.message || "No fue posible actualizar el estado");
      setToast({
        open: true,
        kind: "error",
        message: "No fue posible actualizar",
      });
    } finally {
      setBusy(false);
    }
  }

  function openCancel(itemId: string) {
    setActionMode("cancel");
    setActionItemId(itemId);
    setActionOpen(true);
  }

  function openReplace(itemId: string) {
    setActionMode("replace");
    setActionItemId(itemId);
    setActionOpen(true);
  }

  async function handleActionSubmit(payload: {
    reason: string;
    newName?: string;
  }) {
    if (!ticket || !actionItemId) return;
    setError(null);
    setBusy(true);

    try {
      if (actionMode === "cancel") {
        await ticketsService.cancelItem({
          ticketId: ticket.id,
          itemId: actionItemId,
          reason: payload.reason,
          user_name: userName || "Operario",
        });
        setToast({
          open: true,
          kind: "success",
          message: "Producto cancelado ✅",
        });
      } else {
        await ticketsService.replaceItem({
          ticketId: ticket.id,
          itemId: actionItemId,
          new_product_name: payload.newName || "",
          reason: payload.reason,
          user_name: userName || "Operario",
        });
        setToast({
          open: true,
          kind: "success",
          message: "Producto cambiado ✅",
        });
      }

      setActionOpen(false);
      setActionItemId(null);

      onRefresh();
      void events.refetch();
      // opcional: llevar al historial automáticamente
      // setTab("events");
    } catch (err: any) {
      setError(err?.message || "No fue posible completar la acción");
      setToast({
        open: true,
        kind: "error",
        message: "No fue posible completar la acción",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onPrint80() {
    if (!ticket) return;
    setError(null);
    setBusy(true);

    try {
      const html = await ticketsService.printTicket80(ticket.id, 80);

      const w = window.open("", "_blank");
      if (!w) throw new Error("El navegador bloqueó la ventana emergente");

      w.document.open();
      w.document.write(html);
      w.document.close();

      setToast({
        open: true,
        kind: "success",
        message: "Enviado a impresión ✅",
      });
      void events.refetch();
    } catch (err: any) {
      setError(err?.message || "No fue posible imprimir");
      setToast({
        open: true,
        kind: "error",
        message: "No fue posible imprimir",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!canRender) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute inset-0 flex items-end justify-center p-4 sm:items-center">
        <div className="w-full max-w-3xl rounded-3xl border border-stone-200 bg-food-cream shadow-xl">
          <div className="border-b border-stone-200 p-5">{header}</div>

          <div className="p-5">
            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
                {error}
              </div>
            )}

            {/* Tabs + acciones */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab("items")}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-extrabold shadow-sm transition",
                    tab === "items"
                      ? "bg-food-wine text-white"
                      : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50",
                  ].join(" ")}
                >
                  Productos
                </button>

                <button
                  onClick={() => setTab("events")}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-extrabold shadow-sm transition",
                    tab === "events"
                      ? "bg-food-wine text-white"
                      : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50",
                  ].join(" ")}
                >
                  Historial
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onPrint80}
                  disabled={busy}
                  className="rounded-xl bg-food-mustard px-3 py-2 text-sm font-extrabold text-black shadow-sm transition hover:brightness-95 disabled:opacity-60"
                >
                  Imprimir 80mm
                </button>

                <button
                  onClick={onClose}
                  className="rounded-xl bg-food-wine px-3 py-2 text-sm font-extrabold text-white shadow-sm transition hover:brightness-95"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* TAB Productos */}
            {tab === "items" && (
              <div className="mt-4 space-y-3">
                {ticket!.items.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-2xl border border-stone-200 bg-white/70 p-4 backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-stone-900">
                          {it.qty} × {it.product_name}
                        </div>
                        <div className="mt-1 text-xs text-stone-600">
                          Unidad: {it.unidad ?? "—"}
                        </div>
                      </div>
                      <StatusPill kind="item" status={it.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() => setItemStatus(it.id, "PENDIENTE")}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-extrabold text-stone-800 transition hover:bg-stone-50 disabled:opacity-60"
                      >
                        Pendiente
                      </button>

                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() => setItemStatus(it.id, "EN_PREPARACION")}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-extrabold text-stone-800 transition hover:bg-stone-50 disabled:opacity-60"
                      >
                        Preparación
                      </button>

                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() => setItemStatus(it.id, "ENTREGADO")}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-extrabold text-stone-800 transition hover:bg-stone-50 disabled:opacity-60"
                      >
                        Entregado
                      </button>

                      <div className="flex-1" />

                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() => openReplace(it.id)}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-extrabold text-stone-800 transition hover:bg-stone-50 disabled:opacity-60"
                      >
                        Cambiar
                      </button>

                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() => openCancel(it.id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-950 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB Historial */}
            {tab === "events" && (
              <div className="mt-4">
                {events.isLoading && (
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-sm">
                    Cargando historial…
                  </div>
                )}

                {events.isError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
                    {String(
                      (events.error as any)?.message ||
                        "Error cargando historial",
                    )}
                  </div>
                )}

                {!events.isLoading && !events.isError && (
                  <TicketEventsTimeline events={events.data ?? []} />
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => events.refetch()}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-extrabold text-stone-800 hover:bg-stone-50"
                    disabled={events.isLoading}
                  >
                    Actualizar historial
                  </button>
                </div>
              </div>
            )}

            {busy && (
              <div className="mt-4 text-xs text-stone-600">Procesando…</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal interno */}
      <ItemActionModal
        open={actionOpen}
        mode={actionMode}
        itemLabel={actionLabel}
        busy={busy}
        onClose={() => setActionOpen(false)}
        onSubmit={handleActionSubmit}
        defaultNewName={
          actionMode === "replace" ? (actionItem?.product_name ?? "") : ""
        }
        defaultReason={actionMode === "cancel" ? "" : "Cambio solicitado"}
      />

      {/* Toast */}
      <Toast
        open={toast.open}
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
