"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, LottoBallResult } from "@/types";
import { LottoBalls } from "./LottoBalls";
import { LottoJackpotLines } from "./LottoJackpotLines";

const SECTION_LABELS: Record<string, { emoji: string; short: string }> = {
  "Star Toto 6/50": { emoji: "⭐", short: "STAR TOTO 6/50" },
  "Power Toto 6/55": { emoji: "⚡", short: "POWER TOTO 6/55" },
  "Supreme Toto 6/58": { emoji: "👑", short: "SUPREME TOTO 6/58" },
};

interface TotoLottoCombinedCardProps {
  games: LottoBallResult[];
  date: string;
  draw_no?: string;
  status: DrawStatus;
}

export function TotoLottoCombinedCard({
  games,
  date,
  draw_no,
  status,
}: TotoLottoCombinedCardProps) {
  const revealed = status !== "pending";

  return (
    <article className="rounded-xl border border-line bg-surface-2 overflow-hidden min-w-0">
      <header className="flex items-center gap-2 px-2.5 py-2 border-b border-line bg-surface-3">
        <LogoBadge operator="toto_lotto" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Sports Toto Lotto</h3>
          <p className="text-[10px] text-muted">
            Star 6/50 · Power 6/55 · Supreme 6/58
          </p>
        </div>
        <StatusTag status={status} />
      </header>

      {games.map((game, idx) => (
        <section
          key={game.displayName}
          className={`px-3 py-3 space-y-2 ${
            idx < games.length - 1 ? "border-b border-line" : ""
          }`}
        >
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">
            {SECTION_LABELS[game.displayName]?.emoji ?? "•"}{" "}
            {SECTION_LABELS[game.displayName]?.short ?? game.displayName}
          </p>
          <LottoBalls
            balls={game.balls}
            bonus={game.bonus}
            hasBonus={game.hasBonus}
            size="sm"
            revealed={revealed}
          />
          {revealed && <LottoJackpotLines data={game} compact />}
        </section>
      ))}

      <footer className="flex justify-between px-2.5 py-1.5 text-[10px] text-dim border-t border-line">
        <span>期号 {draw_no ?? "—"}</span>
        <span>{formatDrawDate(date)}</span>
      </footer>
    </article>
  );
}
