"use client";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
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

export function TotoLottoCombinedCard({ games, date, draw_no, status }: TotoLottoCombinedCardProps) {
  const { t } = useLang();
  const revealed = status === "drawn";
  return (
    <article style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(255,51,51,0.15)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #FF3333, transparent)" }} />
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,51,51,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoBadge operator="toto_lotto" />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Sports Toto Lotto</h3>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Star 6/50 · Power 6/55 · Supreme 6/58</p>
        </div>
        <span style={{ fontSize: 9, color: "#00E5FF", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
          {status === "drawn"
            ? t("completed")
            : status === "live"
              ? t("liveDrawing")
              : t("noLiveData")}
        </span>
      </header>
      {games.map((game, idx) => (
        <section key={game.displayName} style={{ padding: "12px 14px", borderBottom: idx < games.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            {SECTION_LABELS[game.displayName]?.emoji ?? "•"}{" "}
            {SECTION_LABELS[game.displayName]?.short ?? game.displayName}
          </p>
          <LottoBalls balls={game.balls} bonus={game.bonus} hasBonus={game.hasBonus} size="sm" revealed={revealed} slotCount={6} />
          {revealed && <LottoJackpotLines data={game} compact />}
        </section>
      ))}
      <footer style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t("drawNoLabel")} {draw_no ?? "—"}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{formatDrawDate(date)}</span>
      </footer>
    </article>
  );
}
