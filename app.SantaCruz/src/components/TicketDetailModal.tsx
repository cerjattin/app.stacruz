import { useMemo, useState } from "react";
import type { ItemStatus, TicketDetail } from "../lib/types";
import { formatTime } from "../lib/status";
import { StatusPill } from "./StatusPill";
import * as ticketsService from "../services/ticketsService";
import { useAuth } from "../context/AuthContext";

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

  const canRender = open && ticket;

  const header = useMemo(() => {
    if (!ticket) return null;
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">Mesa</div>
          <div className="text-2xl font-bold text-slate-900">#{ticket.mesa_ref ?? "—"}</div>
          <div className="mt-1 text-sm text-slate-700">
            <span className="font-semibold">Mesero:</span> {ticket.mesero_nombre ?? "—"}
          </div>
          <div className="mt-1 text-sm text-slate-700">
            <span className="font-semibold">Pedido:</span> {ticket.pos_consec_docto ?? "—"} ·
            <span className="font-semibold"> Comanda:</span> {ticket.comanda_number}
          </div>
        </div>
        <div className="text-right">
          <StatusPill kind="ticket" status={ticket.status} />
          <div className="mt-2 text-xs text-slate-600">
            Pedido: <span className="font-semibold">{formatTime(ticket.hora_pedido)}</span>
          </div>
          <div className="text-xs text-slate-600">
            Prep.: <span className="font-semibold">{formatTime(ticket.hora_preparacion)}</span>
          </div>
          <div className="text-xs text-slate-600">
            Entrega: <span className="font-semibold">{formatTime(ticket.hora_entrega)}</span>
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
      await ticketsService.updateItemStatus({ ticketId: ticket.id, itemId, status, user_name: userName || "Operario" });
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "No fue posible actualizar el estado");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel(itemId: string) {
    if (!ticket) return;
    const reason = prompt("Motivo de cancelación:");
    if (!reason) return;
    setError(null);
    setBusy(true);
    try {
      await ticketsService.cancelItem({ ticketId: ticket.id, itemId, reason, user_name: userName || "Operario" });
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "No fue posible cancelar el producto");
    } finally {
      setBusy(false);
    }
  }

  async function onReplace(itemId: string) {
    if (!ticket) return;
    const newName = prompt("Nuevo producto (nombre):");
    if (!newName) return;
    const reason = prompt("Motivo del cambio:") || "Cambio solicitado";
    setError(null);
    setBusy(true);
    try {
      await ticketsService.replaceItem({
        ticketId: ticket.id,
        itemId,
        new_product_name: newName,
        reason,
        user_name: userName || "Operario",
      });
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "No fue posible cambiar el producto");
    } finally {
      setBusy(false);
    }
  }

  async function onPrint() {
    if (!ticket) return;
    setError(null);
    setBusy(true);
    try {
      const html = await ticketsService.printTicket(ticket.id);
      const w = window.open("", "_blank");
      if (!w) throw new Error("El navegador bloqueó la ventana emergente");
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (err: any) {
      setError(err?.message || "No fue posible imprimir");
    } finally {
      setBusy(false);
    }
  }

  if (!canRender) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-end justify-center p-4 sm:items-center">
        <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-5">{header}</div>

          <div className="p-5">
            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Productos</h2>
              <div className="flex gap-2">
                <button
                  onClick={onPrint}
                  disabled={busy}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Imprimir
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {ticket!.items.map((it) => (
                <div key={it.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {it.qty} × {it.product_name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Unidad: {it.unidad ?? "—"}</div>
                    </div>
                    <StatusPill kind="item" status={it.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      disabled={busy || it.status === "CANCELADO"}
                      onClick={() => setItemStatus(it.id, "PENDIENTE")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Pendiente
                    </button>
                    <button
                      disabled={busy || it.status === "CANCELADO"}
                      onClick={() => setItemStatus(it.id, "EN_PREPARACION")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Preparación
                    </button>
                    <button
                      disabled={busy || it.status === "CANCELADO"}
                      onClick={() => setItemStatus(it.id, "ENTREGADO")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Entregado
                    </button>

                    <div className="flex-1" />

                    <button
                      disabled={busy || it.status === "CANCELADO"}
                      onClick={() => onReplace(it.id)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cambiar
                    </button>
                    <button
                      disabled={busy || it.status === "CANCELADO"}
                      onClick={() => onCancel(it.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {busy && <div className="mt-4 text-xs text-slate-500">Procesando…</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
