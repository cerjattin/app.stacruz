import { useEffect, useMemo, useState } from "react";

type Mode = "cancel" | "replace";

type Props = {
  open: boolean;
  mode: Mode;
  itemLabel: string; // ej: "2 × Hamburguesa"
  busy?: boolean;
  onClose: () => void;

  onSubmit: (payload: {
    reason: string;
    newName?: string;
  }) => void | Promise<void>;

  defaultReason?: string;
  defaultNewName?: string;
};

export function ItemActionModal({
  open,
  mode,
  itemLabel,
  busy = false,
  onClose,
  onSubmit,
  defaultReason,
  defaultNewName,
}: Props) {
  const title = mode === "cancel" ? "Cancelar producto" : "Cambiar producto";

  const [reason, setReason] = useState(defaultReason ?? "");
  const [newName, setNewName] = useState(defaultNewName ?? "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason(defaultReason ?? "");
    setNewName(defaultNewName ?? "");
    setTouched(false);
  }, [open, defaultReason, defaultNewName]);

  const errors = useMemo(() => {
    const e: { reason?: string; newName?: string } = {};
    if (!reason.trim()) e.reason = "El motivo es obligatorio.";
    if (mode === "replace" && !newName.trim())
      e.newName = "El nuevo producto es obligatorio.";
    return e;
  }, [mode, reason, newName]);

  const canSubmit = Object.keys(errors).length === 0 && !busy;

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (!busy) onClose();
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        if (canSubmit) {
          void onSubmit({
            reason: reason.trim(),
            newName: mode === "replace" ? newName.trim() : undefined,
          });
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, canSubmit, onSubmit, reason, newName, mode, busy]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/55"
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <div className="absolute inset-0 flex items-end justify-center p-4 sm:items-center">
        <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-food-cream shadow-xl">
          <div className="border-b border-stone-200 p-5 relative">
            <div className="text-sm font-extrabold tracking-wide text-food-wine">
              {title}
            </div>
            <div className="mt-1 text-xs text-stone-600">{itemLabel}</div>

            <button
              onClick={onClose}
              disabled={busy}
              className="absolute right-4 top-4 rounded-xl px-2 py-1 text-sm font-extrabold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-4">
            {mode === "replace" && (
              <div>
                <label className="text-xs font-extrabold tracking-wide text-stone-700">
                  Nuevo producto
                </label>
                <input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setTouched(true);
                  }}
                  placeholder="Ej: Hamburguesa sin cebolla"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-food-mustard"
                />
                {touched && errors.newName && (
                  <div className="mt-1 text-xs font-semibold text-red-950">
                    {errors.newName}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-extrabold tracking-wide text-stone-700">
                Motivo
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setTouched(true);
                }}
                rows={3}
                placeholder={
                  mode === "cancel"
                    ? "Ej: Cliente canceló el pedido"
                    : "Ej: Cambio solicitado por el cliente"
                }
                className="mt-1 w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-food-mustard"
              />
              {touched && errors.reason && (
                <div className="mt-1 text-xs font-semibold text-red-950">
                  {errors.reason}
                </div>
              )}
              <div className="mt-2 text-[11px] text-stone-500">
                Tip: usa <span className="font-bold">Ctrl+Enter</span> para
                confirmar rápido.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-extrabold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-60"
              >
                Volver
              </button>

              <button
                onClick={() => {
                  setTouched(true);
                  if (!canSubmit) return;
                  void onSubmit({
                    reason: reason.trim(),
                    newName: mode === "replace" ? newName.trim() : undefined,
                  });
                }}
                disabled={!canSubmit}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-extrabold shadow-sm transition",
                  canSubmit
                    ? "bg-food-mustard text-black hover:brightness-95"
                    : "bg-stone-200 text-stone-500 cursor-not-allowed",
                ].join(" ")}
              >
                {busy
                  ? "Procesando…"
                  : mode === "cancel"
                    ? "Confirmar cancelación"
                    : "Confirmar cambio"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
