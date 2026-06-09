"use client";
import type { ReactNode } from "react";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, MagnumGoldExtra } from "@/types";

interface MagnumGoldCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: MagnumGoldExtra;
}

function DigitCell({ value, revealed }: { value: string; revealed: boolean }) {
  const empty = value === "" || value === " ";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      height: 40, width: 36, borderRadius: 8, fontFamily: "var(--font-jetbrains)",
      fontSize: 16, fontWeight: 800,
      background: empty ? "rgba(255,255,255,0.03)" : "rgba(255,215,0,0.08)",
      border: empty ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,215,0,0.3)",
      color: revealed && !empty ? "#FFD700" : "rgba(255,255,255,0.15)",
    }}>
      {!revealed ? "—" : empty ? " " : value}
    </span>
  );
}

function DigitRow({ digits, bonus, revealed }: { digits: string[]; bonus: string[]; revealed: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {digits.map((d, i) => <DigitCell key={`d-${i}`} value={d} revealed={revealed} />)}
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "0 2px" }}>+</span>
      {bonus.map((b, i) => <DigitCell key={`b-${i}`} value={b} revealed={revealed} />)}
    </div>
  );
}

function PrizeBlock({ title, children, prize, revealed }: { title: string; children: ReactNode; prize?: number; revealed: boolean }) {
  return (
    <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{title}</p>
      {children}
      {prize != null && (
        <p style={{ fontSize: 12, color: "#FFB020", marginTop: 8, fontFamily: "var(--font-jetbrains)" }}>
          Prize: {revealed ? formatCurrency(prize, 2) : "—"}
        </p>
      )}
    </div>
  );
}

export function MagnumGoldCard({ date, draw_no, status, data }: MagnumGoldCardProps) {
  const { t } = useLang();
  const revealed = status !== "pending";
  return (
    <article style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #FFD700, transparent)" }} />
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,215,0,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoBadge operator="magnum_jg" />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Magnum Jackpot Gold</h3>
        </div>
        <span style={{ fontSize: 9, color: "#00E5FF", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
          {status === "drawn" ? t("completed") : t("pending")}
        </span>
      </header>
      <PrizeBlock title="JACKPOT 1" prize={data.jackpot1.prize} revealed={revealed}>
        <DigitRow digits={data.jackpot1.digits} bonus={data.jackpot1.bonus} revealed={revealed} />
      </PrizeBlock>
      <PrizeBlock title="JACKPOT 2" prize={data.jackpot2.prize} revealed={revealed}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.jackpot2.variations.map((v, i) => (
            <div key={i}>
              {i > 0 && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "4px 0" }}>OR</p>}
              <DigitRow digits={v.digits} bonus={v.bonus} revealed={revealed} />
            </div>
          ))}
        </div>
      </PrizeBlock>
      <section style={{ padding: "8px 14px" }}>
        {data.subPrizes.map((p) => (
          <div key={p.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{p.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FFB020", fontFamily: "var(--font-jetbrains)" }}>
              {revealed ? formatCurrency(p.amount) : "—"}
            </span>
          </div>
        ))}
      </section>
      <footer style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{formatDrawDate(date)}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t("drawNoLabel")} {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
