import type { HeatLevel } from "@/types/number-intelligence";

const STYLES: Record<
  HeatLevel,
  { label: string; className: string }
> = {
  hot: {
    label: "🔥 Hot",
    className: "bg-orange-500/15 border-orange-500/40 text-orange-400",
  },
  cold: {
    label: "❄️ Cold",
    className: "bg-sky-500/15 border-sky-500/40 text-sky-300",
  },
  normal: {
    label: "— Normal",
    className: "bg-surface-4 border-line text-muted",
  },
};

export function HeatBadge({ level }: { level: HeatLevel }) {
  const s = STYLES[level];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${s.className}`}
    >
      {s.label}
    </span>
  );
}
