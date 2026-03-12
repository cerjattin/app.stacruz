type Props = {
  minutes: number;
  tone: "ok" | "warn" | "danger";
};

export function AgeBadge({ minutes, tone }: Props) {
  const cls =
    tone === "ok"
      ? "bg-lime-100 text-lime-900 border border-lime-200"
      : tone === "warn"
        ? "bg-amber-100 text-amber-900 border border-amber-200"
        : "bg-red-100 text-red-900 border border-red-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${cls}`}
    >
      {minutes} min
    </span>
  );
}
