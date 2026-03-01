type Props = {
  minutes: number;
  tone: "ok" | "warn" | "danger";
};

export function AgeBadge({ minutes, tone }: Props) {
  const cls =
    tone === "ok"
      ? "bg-lime-100 text-food-olive"
      : tone === "warn"
      ? "bg-yellow-100 text-food-mustard"
      : "bg-red-100 text-food-wine";

  return (
    <span
      className={`px-2.5 py-1 text-[11px] rounded-full font-extrabold tracking-wide ${cls}`}
    >
      {minutes} min
    </span>
  );
}