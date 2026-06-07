"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, MagnumLifeExtra } from "@/types";

interface MagnumLifeCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: MagnumLifeExtra;
}

export function MagnumLifeCard({
  date,
  draw_no,
  status,
  data,
}: MagnumLifeCardProps) {
  const revealed = status !== "pending";
  const ballPending =
    "flex h-11 w-11 items-center justify-center rounded-full border border-line/70 bg-surface-3/60 text-base font-bold font-number text-muted opacity-70";

  return (
    <article className="subpage-card overflow-hidden">
      <header
        className="flex items-center gap-2 px-3 py-2.5 border-b border-line"
        style={{ backgroundColor: "#FFD70018" }}
      >
        <LogoBadge operator="magnum_life" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Magnum Life</h3>
          <p className="text-[10px] text-muted">8 winning + 2 bonus (1–36)</p>
        </div>
        <StatusTag status={status} />
      </header>
      <section className="px-3 py-4">
        <p className="text-[10px] text-muted mb-2">Winning Numbers</p>
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {(revealed ? data.winning : data.winning.map(() => 0)).map((n, i) => (
            <span
              key={`w-${i}-${n}`}
              className={
                revealed
                  ? "flex h-11 w-11 items-center justify-center rounded-full bg-surface-4 text-base font-bold font-number border border-line"
                  : ballPending
              }
            >
              {revealed ? n : "—"}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-muted mb-2">Bonus</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(revealed ? data.bonus : data.bonus.map(() => 0)).map((n, i) => (
            <span
              key={`b-${i}-${n}`}
              className={
                revealed
                  ? "flex h-11 w-11 items-center justify-center rounded-full bg-surface-3 text-base font-bold font-number border-2 border-gold text-gold"
                  : ballPending
              }
            >
              {revealed ? n : "—"}
            </span>
          ))}
        </div>
      </section>
      <footer className="flex justify-between px-3 py-2 text-[10px] text-dim border-t border-line">
        <span>{formatDrawDate(date)}</span>
        <span>期号 {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
