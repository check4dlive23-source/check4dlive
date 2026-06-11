"use client";
import { LogoBadge, resolveLottoLogo } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type { LottoBallResult } from "@/types";
import { LottoBalls } from "./LottoBalls";
import { LottoJackpotLines } from "./LottoJackpotLines";
import { NoLiveDataPlaceholder } from "./NoLiveDataPlaceholder";

interface LottoBallCardProps {
  data: LottoBallResult;
  noLiveData?: boolean;
}

export function LottoBallCard({ data, noLiveData = false }: LottoBallCardProps) {
  const { t } = useLang();
  const logo = resolveLottoLogo(data);
  const revealed = data.status !== "pending";
  const hasJackpot = data.jackpot1_amount != null || data.jackpot2_amount != null || data.jackpot_amount != null;

  const isSabah = data.operator === "sabah";
  const isSG = data.operator === "sgpools";
  const borderColor = isSabah ? "rgba(180,83,9,0.2)" : isSG ? "rgba(157,23,77,0.2)" : "rgba(255,51,51,0.15)";
  const topColor = isSabah ? "#F59E0B" : isSG ? "#EC4899" : "#FF3333";
  const headerBg = isSabah ? "rgba(180,83,9,0.06)" : isSG ? "rgba(157,23,77,0.06)" : "rgba(255,51,51,0.05)";

  return (
    <article style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: `1px solid ${borderColor}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${topColor}, transparent)` }} />
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: headerBg, display: "flex", alignItems: "center", gap: 12 }}>
        <LogoBadge operator={logo} />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{data.displayName}</h3>
          {data.subtitle && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{data.subtitle}</p>}
        </div>
        <span style={{ fontSize: 9, color: "#00E5FF", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
          {data.status === "drawn" ? t("completed") : t("pending")}
        </span>
      </header>
      <section style={{ padding: noLiveData ? 0 : "14px" }}>
        {noLiveData ? (
          <NoLiveDataPlaceholder />
        ) : (
          <>
            <LottoBalls balls={data.balls} bonus={data.bonus} hasBonus={data.hasBonus} size="md" revealed={revealed} slotCount={6} />
            {revealed && hasJackpot && <LottoJackpotLines data={data} readable />}
          </>
        )}
      </section>
      <footer style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{formatDrawDate(data.date)}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t("drawNoLabel")} {data.draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
