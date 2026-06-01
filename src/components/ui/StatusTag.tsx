"use client";

import { useLang } from "@/lib/language-context";
import type { DrawStatus } from "@/types";

const statusClass: Record<DrawStatus, string> = {
  live: "bg-live/15 text-live border-live/30",
  drawn: "bg-surface-4 text-muted border-line",
  pending: "bg-surface-3 text-dim border-line",
  daily: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

interface StatusTagProps {
  status: DrawStatus;
}

export function StatusTag({ status }: StatusTagProps) {
  const { t } = useLang();

  const labels: Record<DrawStatus, string> = {
    live: `● ${t("live")}`,
    drawn: t("completed"),
    pending: t("pending"),
    daily: t("daily"),
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass[status]}`}
    >
      {labels[status]}
    </span>
  );
}
