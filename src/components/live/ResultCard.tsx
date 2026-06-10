"use client";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { todayMYT } from "@/lib/draw-time";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import {
  CONSOLATION_SLOT_COUNT,
  getSpecialCount,
  padPrizeSlots,
} from "@/lib/prize-slots";
import type { DrawResult, OperatorId } from "@/types";

const brandColors: Record<OperatorId, string> = {
  magnum: "#FFD700",
  damacai: "#4466FF",
  toto: "#FF3333",
  sabah: "#F59E0B",
  sarawak: "#06B6D4",
  sandakan: "#8B5CF6",
  gd: "#EF4444",
  perdana: "#7C3AED",
  hari: "#059669",
  sgpools: "#EC4899",
};

const OPERATOR_TO_URL: Partial<Record<string, string>> = {
  magnum: "magnum",
  damacai: "damacai",
  toto: "toto",
  sabah: "sabah88",
  sarawak: "cashsweep",
  sandakan: "stc",
  sgpools: "singapore",
};

const filledSlotStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textAlign: "center",
  padding: "4px 2px",
  background: "rgba(0,229,255,0.05)",
  border: "1px solid rgba(0,229,255,0.1)",
  borderRadius: 6,
  color: "var(--cyan)",
  display: "block",
  fontFamily: "var(--font-jetbrains)",
};

const emptySlotStyle: CSSProperties = {
  fontSize: 13,
  textAlign: "center",
  padding: "4px 2px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 6,
  color: "rgba(255,255,255,0.1)",
  display: "block",
};

function slotCellStyle(n: string, revealed: boolean): CSSProperties {
  return !revealed || n === "----" ? emptySlotStyle : filledSlotStyle;
}

interface ResultCardProps {
  data: DrawResult;
}

export function ResultCard({ data }: ResultCardProps) {
  const { t } = useLang();
  const operator = data.operator;
  const brand = brandColors[operator] ?? "#00E5FF";
  const spCount = getSpecialCount(operator);
  const specialSlots = padPrizeSlots(data.special_numbers, spCount);
  const specialFirstRow = specialSlots.slice(0, 10);
  const specialLastRow = spCount > 10 ? specialSlots.slice(10) : [];
  const consolationSlots = padPrizeSlots(data.consolation_numbers, CONSOLATION_SLOT_COUNT);
  const revealed = data.status !== "pending";
  const [today, setToday] = useState("");
  useEffect(() => { setToday(todayMYT()); }, []);
  const isTodayPending = data.status === "pending" && Boolean(today) && data.date === today;
  const showZodiac = revealed && operator === "toto" && Boolean(data.zodiac);
  const showJackpot = revealed && (operator === "magnum" || operator === "damacai" || operator === "toto") && (data.jackpot1_amount ?? 0) > 0;

  const isLive = data.status === "live";
  const isDrawn = data.status === "drawn";

  return (
    <article style={{
      background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)",
      border: `1px solid ${isLive ? brand : isDrawn ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: isLive ? `0 0 20px ${brand}30` : "none",
      transition: "border-color 0.3s",
    }}>
      {/* 顶部品牌色条 */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${brand}, transparent)` }} />
      
      {/* 卡片头部 */}
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: `${brand}10` }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 48, height: 48 }} className="shrink-0">
            <LogoBadge operator={data.operator} size={48} />
          </div>
          <div className="flex-1 min-w-0">
            {OPERATOR_TO_URL[data.operator] ? (
              <Link
                href={`/operator/${OPERATOR_TO_URL[data.operator]}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }} className="truncate">
                  {data.displayName}
                </h3>
              </Link>
            ) : (
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }} className="truncate">
                {data.displayName}
              </h3>
            )}
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{formatDrawDate(data.date)}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{data.draw_no ?? "—"}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isLive && (
              <span className="inline-flex items-center gap-1" style={{ background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.3)", borderRadius: 100, padding: "3px 8px", fontSize: 9, color: "#00FF88", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
                <span className="animate-pulse rounded-full" style={{ width: 5, height: 5, backgroundColor: "#00FF88" }} />
                LIVE
              </span>
            )}
            {isDrawn && (
              <span style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontSize: 9, color: "#00E5FF", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
                {t("completed")}
              </span>
            )}
            {!isLive && !isDrawn && (
              <span style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "3px 8px", fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
                {t("pending")}
              </span>
            )}
            {isTodayPending && (
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{t("waitingForDraw")}</span>
            )}
          </div>
        </div>
      </header>

      {/* 前三奖 */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="grid grid-cols-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {[t("firstPrize"), t("secondPrize"), t("thirdPrize")].map((label, i) => (
            <div key={i} style={{ padding: "6px 4px", textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3" style={{ padding: "8px 4px" }}>
          <div style={{ textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
            {revealed && data.first_prize ? (
              <span className="font-mono tabular-nums" style={{ fontSize: 26, fontWeight: 900, color: "#FFD700", letterSpacing: "0.1em", display: "block" }}>{data.first_prize}</span>
            ) : (
              <span style={{ fontSize: 26, color: "rgba(255,255,255,0.1)", display: "block", textAlign: "center" }}>----</span>
            )}
            {showZodiac && <span style={{ fontSize: 10, color: "#FFD700" }}>{data.zodiac}</span>}
          </div>
          <div style={{ textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
            {revealed && data.second_prize ? (
              <span className="font-mono tabular-nums" style={{ fontSize: 26, fontWeight: 900, color: "rgba(192,192,192,0.9)", letterSpacing: "0.1em", display: "block" }}>{data.second_prize}</span>
            ) : (
              <span style={{ fontSize: 26, color: "rgba(255,255,255,0.1)", display: "block", textAlign: "center" }}>----</span>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            {revealed && data.third_prize ? (
              <span className="font-mono tabular-nums" style={{ fontSize: 26, fontWeight: 900, color: "rgba(205,127,50,0.9)", letterSpacing: "0.1em", display: "block" }}>{data.third_prize}</span>
            ) : (
              <span style={{ fontSize: 26, color: "rgba(255,255,255,0.1)", display: "block", textAlign: "center" }}>----</span>
            )}
          </div>
        </div>
      </div>

      {/* 特别奖 */}
      <section style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{t("specialSection")}</p>
        <div className="space-y-1">
          <div className="grid grid-cols-5 gap-1">
            {specialFirstRow.map((n, i) => (
              <span key={`sp-${i}`} className="font-mono tabular-nums" style={slotCellStyle(n, revealed)}>
                {revealed ? (n === "----" ? "—" : n) : "----"}
              </span>
            ))}
          </div>
          {specialLastRow.length > 0 && (
            <div className="grid grid-cols-5 gap-1">
              {specialLastRow.map((n, i) => (
                <span key={`sp-last-${i}`} className={`font-mono tabular-nums ${i === 0 ? "col-start-2" : ""}`} style={slotCellStyle(n, revealed)}>
                  {revealed ? (n === "----" ? "—" : n) : "----"}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 安慰奖 */}
      <section style={{ padding: "10px 14px", borderBottom: showJackpot ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{t("consolationSection")}</p>
        <div className="grid grid-cols-5 gap-1">
          {consolationSlots.map((n, i) => (
            <span key={`cn-${i}`} className="font-mono tabular-nums" style={slotCellStyle(n, revealed)}>
              {revealed ? (n === "----" ? "—" : n) : "----"}
            </span>
          ))}
        </div>
      </section>

      {/* Jackpot */}
      {showJackpot && (
        <section style={{ padding: "10px 14px" }}>
          {data.jackpot1_amount != null && (
            <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t("jackpot1")}</span>
              <span className="font-mono tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: "#FFB020" }}>{formatCurrency(data.jackpot1_amount)}</span>
            </div>
          )}
          {data.jackpot2_amount != null && (
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t("jackpot2")}</span>
              <span className="font-mono tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: "#FFB020" }}>{formatCurrency(data.jackpot2_amount)}</span>
            </div>
          )}
        </section>
      )}
    </article>
  );
}
