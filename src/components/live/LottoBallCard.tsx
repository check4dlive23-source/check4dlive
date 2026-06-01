"use client";

import { LogoBadge, resolveLottoLogo } from "@/components/ui/LogoBadge";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDrawDate } from "@/lib/number-utils";
import type { LottoBallResult } from "@/types";
import { LottoBalls } from "./LottoBalls";
import { LottoJackpotLines } from "./LottoJackpotLines";

interface LottoBallCardProps {
  data: LottoBallResult;
}

export function LottoBallCard({ data }: LottoBallCardProps) {
  const logo = resolveLottoLogo(data);
  const hasJackpot =
    data.jackpot1_amount != null ||
    data.jackpot2_amount != null ||
    data.jackpot_amount != null;

  return (
    <article className="rounded-xl border border-line bg-surface-2 overflow-hidden">
      <header className="flex items-center gap-2 px-2.5 py-2 border-b border-line bg-surface-3">
        <LogoBadge operator={logo} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{data.displayName}</h3>
          {data.subtitle && (
            <p className="text-[10px] text-muted">{data.subtitle}</p>
          )}
        </div>
        <StatusTag status={data.status} />
      </header>

      <section className="px-2.5 py-2 space-y-2">
        <LottoBalls
          balls={data.balls}
          bonus={data.bonus}
          hasBonus={data.hasBonus}
          size="sm"
        />
        {hasJackpot && <LottoJackpotLines data={data} compact />}
      </section>

      <footer className="flex justify-between px-2.5 py-1.5 text-[10px] text-dim border-t border-line">
        <span>期号 {data.draw_no ?? "—"}</span>
        <span>{formatDrawDate(data.date)}</span>
      </footer>
    </article>
  );
}
