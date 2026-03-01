export function SyncButton({
  busy,
  onClick,
  disabled,
}: {
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const isDisabled = busy || disabled;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={[
        "rounded-xl px-4 py-2 text-sm font-extrabold tracking-wide shadow-sm transition",
        isDisabled
          ? "cursor-not-allowed bg-stone-200 text-stone-500"
          : "bg-food-mustard text-black hover:brightness-95 active:scale-[0.98]",
      ].join(" ")}
    >
      {busy ? "Sincronizando…" : "Sincronizar ahora"}
    </button>
  );
}