"use client";

import type { ReactNode } from "react";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, MagnumGoldExtra } from "@/types";

interface MagnumGoldCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: MagnumGoldExtra;
}

function DigitCell({ value }: { value: string }) {
  const empty = value === "" || value === " ";
  return (
    <span
      className={`inline-flex h-7 w-6 items-center justify-center rounded border font-number text-sm ${
        empty
          ? "border-line/50 bg-surface-3/50 text-dim"
          : "border-line bg-surface-4 text-foreground"
      }`}
    >
      {empty ? " " : value}
    </span>
  );
}

function DigitRow({
  digits,
  bonus,
}: {
  digits: string[];
  bonus: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {digits.map((d, i) => (
        <DigitCell key={`d-${i}`} value={d} />
      ))}
      <span className="text-muted text-xs px-0.5">+</span>
      {bonus.map((b, i) => (
        <DigitCell key={`b-${i}`} value={b} />
      ))}
    </div>
  );
}

function PrizeBlock({
  title,
  children,
  prize,
}: {
  title: string;
  children: ReactNode;
  prize?: number;
}) {
  return (
    <div className="px-2.5 py-2 border-b border-line space-y-1.5">
      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
        {title}
      </p>
      {children}
      {prize != null && (
        <p className="text-sm text-gold font-number">
          Prize: {formatCurrency(prize, 2)}
        </p>
      )}
    </div>
  );
}

export function MagnumGoldCard({
  date,
  draw_no,
  status,
  data,
}: MagnumGoldCardProps) {
  return (
    <article className="rounded-xl border border-line bg-surface-2 overflow-hidden min-w-0">
      <header
        className="flex items-center gap-2 px-3 py-2.5 border-b border-line"
        style={{ backgroundColor: "#FFD70018" }}
      >
        <LogoBadge operator="magnum_jg" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Magnum Jackpot Gold
          </h3>
        </div>
        <StatusTag status={status} />
      </header>

      <PrizeBlock title="Jackpot 1" prize={data.jackpot1.prize}>
        <DigitRow digits={data.jackpot1.digits} bonus={data.jackpot1.bonus} />
      </PrizeBlock>

      <PrizeBlock title="Jackpot 2" prize={data.jackpot2.prize}>
        <div className="space-y-2">
          {data.jackpot2.variations.map((v, i) => (
            <div key={i}>
              {i > 0 && (
                <p className="text-[10px] text-muted text-center py-1">OR</p>
              )}
              <DigitRow digits={v.digits} bonus={v.bonus} />
            </div>
          ))}
        </div>
      </PrizeBlock>

      <section className="px-2.5 py-1.5 divide-y divide-line border-b border-line">
        {data.subPrizes.map((p) => (
          <div
            key={p.label}
            className="flex justify-between items-center py-2 text-sm"
          >
            <span className="text-muted">{p.label}</span>
            <span className="font-number text-gold">
              {formatCurrency(p.amount)}
            </span>
          </div>
        ))}
      </section>

      <footer className="flex justify-between px-3 py-2 text-[10px] text-dim">
        <span>期号 {draw_no ?? "—"}</span>
        <span>{formatDrawDate(date)}</span>
      </footer>
    </article>
  );
}
