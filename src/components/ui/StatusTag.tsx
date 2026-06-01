import type { DrawStatus } from "@/types";

const config: Record<
  DrawStatus,
  { label: string; className: string }
> = {
  live: {
    label: "● LIVE",
    className: "bg-live/15 text-live border-live/30",
  },
  drawn: {
    label: "已出",
    className: "bg-surface-4 text-muted border-line",
  },
  pending: {
    label: "待开",
    className: "bg-surface-3 text-dim border-line",
  },
  daily: {
    label: "每日",
    className: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
};

interface StatusTagProps {
  status: DrawStatus;
}

export function StatusTag({ status }: StatusTagProps) {
  const { label, className } = config[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
