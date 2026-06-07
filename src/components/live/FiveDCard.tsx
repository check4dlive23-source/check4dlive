"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { PrizeNumber } from "@/components/ui/PrizeNumber";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, Toto5DExtra } from "@/types";

interface FiveDCardProps {
  displayName: string;
  date: string;
  draw_no?: string;
  status: DrawStatus;
  prizes: Toto5DExtra;
}

const tiers = [
  { key: "first" as const, label: "1st (5D)" },
  { key: "second" as const, label: "2nd (5D)" },
  { key: "third" as const, label: "3rd (5D)" },
  { key: "fourth" as const, label: "4th (4D)" },
  { key: "fifth" as const, label: "5th (4D)" },
  { key: "sixth" as const, label: "6th (3D)" },
];

export function FiveDCard({
  displayName,
  date,
  draw_no,
  status,
  prizes,
}: FiveDCardProps) {
  const revealed = status !== "pending";

  return (
    <article className="subpage-card overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-line bg-surface-3">
        <LogoBadge operator="toto_5d" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
        </div>
        <StatusTag status={status} />
      </header>
      <section className="divide-y divide-border">
        {tiers.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between px-3 py-2"
          >
            <span className="text-xs text-muted w-20">{label}</span>
            <PrizeNumber value={prizes[key]} size="md" revealed={revealed} />
          </div>
        ))}
      </section>
      <footer className="flex justify-between px-3 py-2 text-[10px] text-dim border-t border-line">
        <span>{formatDrawDate(date)}</span>
        <span>期号 {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
