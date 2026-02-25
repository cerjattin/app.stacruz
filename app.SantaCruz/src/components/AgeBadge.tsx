// src/components/AgeBadge.tsx

interface Props {
  minutes: number;
  tone: "ok" | "warn" | "danger";
}

export function AgeBadge({ minutes, tone }: Props) {
  const colors = {
    ok: "bg-green-100 text-green-800",
    warn: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800 animate-pulse",
  };

  return (
    <span
      className={`px-2 py-1 text-xs rounded-full font-semibold ${colors[tone]}`}
    >
      {minutes} min
    </span>
  );
}