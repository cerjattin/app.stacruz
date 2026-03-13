import { useMemo, useState } from "react";
import type { ItemStatus, TicketDetail } from "../lib/types";
import { formatTime } from "../lib/status";
import { StatusPill } from "./StatusPill";
import { ItemActionModal } from "./ItemActionModal";
import * as ticketsService from "../services/ticketsService";
import { useAuth } from "../context/AuthContext";

type ActionState =
  | { mode: "cancel"; itemId: string; itemLabel: string }
  | { mode: "replace"; itemId: string; itemLabel: string }
  | null;

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
  const userName =
    state.status === "authenticated" ? state.user.name : "Operario";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);

  const canRender = open && ticket;

  const header = useMemo(() => {
    if (!ticket) return null;
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-stone-500">Mesa</div>
          <div className="text-2xl font-extrabold text-stone-900">
            #{ticket.mesa_ref ?? "—"}
          </div>
          <div className="mt-1 text-sm text-stone-700">
            <span className="font-bold">Mesero:</span>{" "}
            {ticket.mesero_nombre ?? "—"}
          </div>
          <div className="mt-1 text-sm text-stone-700">
            <span className="font-bold">Pedido:</span>{" "}
            {ticket.pos_consec_docto ?? "—"} ·
            <span className="font-bold"> Comanda:</span>{" "}
            {ticket.comanda_number ?? "—"}
          </div>
        </div>
        <div className="text-right">
          <StatusPill kind="ticket" status={ticket.status} />
          <div className="mt-2 text-xs text-stone-600">
            Pedido:{" "}
            <span className="font-bold">{formatTime(ticket.hora_pedido)}</span>
          </div>
          <div className="text-xs text-stone-600">
            Prep.:{" "}
            <span className="font-bold">
              {formatTime(ticket.hora_preparacion)}
            </span>
          </div>
          <div className="text-xs text-stone-600">
            Entrega:{" "}
            <span className="font-bold">{formatTime(ticket.hora_entrega)}</span>
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
        user_name: userName,
      });
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "No fue posible actualizar el estado");
    } finally {
      setBusy(false);
    }
  }

  async function onPrepareAll() {
    if (!ticket) return;
    setError(null);
    setBusy(true);
    try {
      await ticketsService.prepareAllItems({
        ticketId: ticket.id,
        user_name: userName,
      });
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "No fue posible iniciar la preparación masiva");
    } finally {
      setBusy(false);
    }
  }

  async function onDeliverAll() {
    if (!ticket) return;
    setError(null);
    setBusy(true);
    try {
      await ticketsService.deliverAllItems({
        ticketId: ticket.id,
        user_name: userName,
      });
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "No fue posible completar la entrega");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitAction(payload: { reason: string; newName?: string }) {
    if (!ticket || !actionState) return;

    setError(null);
    setBusy(true);
    try {
      if (actionState.mode === "cancel") {
        await ticketsService.cancelItem({
          ticketId: ticket.id,
          itemId: actionState.itemId,
          reason: payload.reason,
          user_name: userName,
        });
      } else {
        await ticketsService.replaceItem({
          ticketId: ticket.id,
          itemId: actionState.itemId,
          new_product_name: payload.newName || "",
          reason: payload.reason,
          user_name: userName,
        });
      }

      setActionState(null);
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "No fue posible procesar la acción");
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
    <>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <div className="absolute inset-0 flex items-end justify-center p-4 sm:items-center">
          <div className="w-full max-w-4xl rounded-3xl border border-stone-200 bg-white shadow-xl">
            <div className="border-b border-stone-200 p-5">{header}</div>

            <div className="p-5">
              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-sm font-extrabold tracking-wide text-stone-900">
                  Productos
                </h2>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={onPrepareAll}
                    disabled={busy}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-extrabold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                  >
                    Preparar todo
                  </button>

                  <button
                    onClick={onDeliverAll}
                    disabled={busy}
                    className="rounded-xl border border-lime-200 bg-lime-50 px-3 py-2 text-sm font-extrabold text-lime-900 hover:bg-lime-100 disabled:opacity-60"
                  >
                    Entrega completa
                  </button>

                  <button
                    onClick={onPrint}
                    disabled={busy}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-extrabold text-stone-700 hover:bg-stone-50"
                  >
                    Imprimir
                  </button>

                  <button
                    onClick={onClose}
                    className="rounded-xl bg-food-wine px-3 py-2 text-sm font-extrabold text-white hover:opacity-95"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {ticket.items.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-2xl border border-stone-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-stone-900">
                          {it.qty} × {it.product_name}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          Unidad: {it.unidad ?? "—"}
                        </div>
                      </div>
                      <StatusPill kind="item" status={it.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() => setItemStatus(it.id, "PENDIENTE")}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-extrabold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                      >
                        Pendiente
                      </button>

                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() => setItemStatus(it.id, "EN_PREPARACION")}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                      >
                        Preparación
                      </button>

                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() => setItemStatus(it.id, "ENTREGADO")}
                        className="rounded-xl border border-lime-200 bg-lime-50 px-3 py-2 text-xs font-extrabold text-lime-900 hover:bg-lime-100 disabled:opacity-60"
                      >
                        Entregado
                      </button>

                      <div className="flex-1" />

                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() =>
                          setActionState({
                            mode: "replace",
                            itemId: it.id,
                            itemLabel: `${it.qty} × ${it.product_name ?? "Producto"}`,
                          })
                        }
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-extrabold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                      >
                        Cambiar
                      </button>

                      <button
                        disabled={busy || it.status === "CANCELADO"}
                        onClick={() =>
                          setActionState({
                            mode: "cancel",
                            itemId: it.id,
                            itemLabel: `${it.qty} × ${it.product_name ?? "Producto"}`,
                          })
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-900 hover:bg-red-100 disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {busy && (
                <div className="mt-4 text-xs text-stone-500">Procesando…</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ItemActionModal
        open={Boolean(actionState)}
        mode={actionState?.mode ?? "cancel"}
        itemLabel={actionState?.itemLabel ?? ""}
        busy={busy}
        onClose={() => {
          if (!busy) setActionState(null);
        }}
        onSubmit={onSubmitAction}
      />
    </>
  );
}
