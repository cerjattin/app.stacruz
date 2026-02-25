export function SyncButton({
  busy,
  onClick,
  disabled,
}: {
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={[
        "rounded-xl px-4 py-2 text-sm font-semibold shadow-sm",
        busy || disabled ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-slate-900 text-white hover:bg-slate-800",
      ].join(" ")}
    >
      {busy ? "Sincronizando…" : "Sincronizar ahora"}
    </button>
  );
}
