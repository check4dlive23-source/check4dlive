"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { PrizeNumber } from "@/components/ui/PrizeNumber";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import type { DrawResult, OperatorId } from "@/types";

const brandColors: Record<OperatorId, string> = {
  magnum: "#FFD700",
  damacai: "#1a3a8f",
  toto: "#CC0000",
  sabah: "#b45309",
  sarawak: "#0e7490",
  sandakan: "#4c1d95",
  gd: "#b91c1c",
  perdana: "#5b21b6",
  hari: "#065f46",
  sgpools: "#9d174d",
};

interface ResultCardProps {
  data: DrawResult;
}

export function ResultCard({ data }: ResultCardProps) {
  const brand = brandColors[data.operator];
  const specialCount = data.special_numbers?.length ?? 0;
  const hasJackpot =
    data.jackpot1_amount != null || data.jackpot2_amount != null;
  const revealed = data.status !== "pending";

  return (
    <article className="rounded-xl border border-line bg-surface-2 overflow-hidden">
      <header
        className="flex items-center gap-2 px-2.5 py-2 border-b border-line"
        style={{ backgroundColor: `${brand}18` }}
      >
        <LogoBadge operator={data.operator} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {data.displayName}
          </h3>
          {data.subtitle && (
            <p className="text-[10px] text-muted truncate">{data.subtitle}</p>
          )}
        </div>
        <StatusTag status={data.status} />
      </header>

      <div className="grid grid-cols-3 border-b border-line bg-surface-3 text-center text-[10px] text-muted">
        <div className="py-1.5 border-r border-line">🥇 一奖</div>
        <div className="py-1.5 border-r border-line">🥈 二奖</div>
        <div className="py-1.5">🥉 三奖</div>
      </div>
      <div className="grid grid-cols-3 border-b border-line text-center py-2">
        <div className="border-r border-line flex flex-col items-center gap-0.5">
          <PrizeNumber value={data.first_prize} revealed={revealed} />
          {data.zodiac && revealed && (
            <span className="text-[10px] text-gold">{data.zodiac}</span>
          )}
        </div>
        <div className="border-r border-line">
          <PrizeNumber value={data.second_prize} revealed={revealed} />
        </div>
        <div>
          <PrizeNumber value={data.third_prize} revealed={revealed} />
        </div>
      </div>

      {specialCount > 0 && (
        <section className="px-2.5 py-2 border-b border-line">
          <p className="text-[10px] text-muted mb-2 uppercase tracking-wider">
            Special ({specialCount})
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {data.special_numbers!.map((n, i) => (
              <PrizeNumber key={i} value={n} size="sm" revealed={revealed} />
            ))}
          </div>
        </section>
      )}

      {(data.consolation_numbers?.length ?? 0) > 0 && (
        <section className="px-2.5 py-2 border-b border-line">
          <p className="text-[10px] text-muted mb-2 uppercase tracking-wider">
            Consolation (10)
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {data.consolation_numbers!.map((n, i) => (
              <PrizeNumber key={i} value={n} size="sm" revealed={revealed} />
            ))}
          </div>
        </section>
      )}

      {hasJackpot && revealed && (
        <section className="px-2.5 py-2 border-b border-line space-y-1">
          {data.jackpot1_amount != null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Jackpot 1</span>
              <span className="font-number text-gold">
                {formatCurrency(data.jackpot1_amount)}
              </span>
            </div>
          )}
          {data.jackpot2_amount != null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Jackpot 2</span>
              <span className="font-number text-gold">
                {formatCurrency(data.jackpot2_amount)}
              </span>
            </div>
          )}
        </section>
      )}

      <footer className="flex justify-between px-2.5 py-2 text-[10px] text-dim">
        <span>期号 {data.draw_no ?? "—"}</span>
        <span>{formatDrawDate(data.date)}</span>
      </footer>
    </article>
  );
}
