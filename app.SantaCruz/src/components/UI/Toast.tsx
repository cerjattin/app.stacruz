import { useEffect } from "react";

export type ToastKind = "success" | "error" | "info";

export function Toast({
  open,
  kind,
  message,
  onClose,
  durationMs = 2500,
}: {
  open: boolean;
  kind: ToastKind;
  message: string;
  onClose: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  const cls =
    kind === "success"
      ? "border-l-food-olive bg-white text-stone-900"
      : kind === "error"
      ? "border-l-red-500 bg-red-50 text-red-950"
      : "border-l-food-mustard bg-white text-stone-900";

  const dot =
    kind === "success"
      ? "bg-food-olive"
      : kind === "error"
      ? "bg-red-500"
      : "bg-food-mustard";

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[min(420px,calc(100vw-2rem))]">
      <div className={`rounded-2xl border border-stone-200 border-l-8 p-4 shadow-xl ${cls}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dot}`} />
          <div className="min-w-0">
            <div className="text-sm font-extrabold tracking-wide">{message}</div>
            <div className="mt-1 text-[11px] text-stone-500">Se cerrará automáticamente</div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-xl px-2 py-1 text-xs font-extrabold text-stone-600 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}