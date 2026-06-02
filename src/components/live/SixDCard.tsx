"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, Toto6DTier } from "@/types";

interface SixDCardProps {
  displayName: string;
  subtitle?: string;
  date: string;
  draw_no?: string;
  status: DrawStatus;
  tiers: Toto6DTier[];
}

export function SixDCard({
  displayName,
  subtitle = "前后两边都中",
  date,
  draw_no,
  status,
  tiers,
}: SixDCardProps) {
  return (
    <article className="rounded-xl border border-line bg-surface-2 overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-line bg-surface-3">
        <LogoBadge operator="toto_6d" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
          <p className="text-[10px] text-muted">{subtitle}</p>
        </div>
        <StatusTag status={status} />
      </header>
      <section className="divide-y divide-border font-number text-sm">
        {tiers.map((tier) => (
          <div key={tier.label} className="px-3 py-2 flex gap-2 items-center flex-wrap">
            <span className="text-muted w-8 shrink-0">{tier.label}</span>
            {tier.label === "1st" ? (
              <span className="text-foreground tracking-wide">{tier.front}</span>
            ) : (
              <>
                <span className="text-foreground tracking-wide">{tier.front}</span>
                <span className="text-muted text-xs">OR</span>
                <span className="text-foreground tracking-wide">{tier.back}</span>
              </>
            )}
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
