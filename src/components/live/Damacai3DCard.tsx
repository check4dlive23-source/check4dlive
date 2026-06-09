"use client";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus } from "@/types";

interface Damacai3DData {
  first: string;
  second: string;
  third: string;
  jackpot1_amount?: number;
  jackpot2_amount?: number;
  jackpot3d_amount?: number;
}

interface Damacai3DCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: Damacai3DData;
}

export function Damacai3DCard({ date, draw_no, status, data }: Damacai3DCardProps) {
  const { t } = useLang();
  const revealed = status !== "pending";
  return (
    <article style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(68,102,255,0.15)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #4466FF, transparent)" }} />
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(68,102,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoBadge operator="damacai" />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Da Ma Cai 3D</h3>
        </div>
        <span style={{ fontSize: 9, color: "#00E5FF", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
          {status === "drawn" ? t("completed") : t("pending")}
        </span>
      </header>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("firstPrize"), value: data.first, color: "#FFD700" },
            { label: t("secondPrize"), value: data.second, color: "rgba(192,192,192,0.9)" },
            { label: t("thirdPrize"), value: data.third, color: "rgba(205,127,50,0.9)" },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{item.label}</p>
              <span className="font-mono tabular-nums" style={{ fontSize: 22, fontWeight: 900, color: revealed ? item.color : "rgba(255,255,255,0.1)" }}>
                {revealed ? item.value : "---"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 14px" }}>
        {data.jackpot1_amount != null && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>1+3D Jackpot 1</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFB020", fontFamily: "var(--font-jetbrains)" }}>{revealed ? formatCurrency(data.jackpot1_amount, 2) : "—"}</span>
          </div>
        )}
        {data.jackpot2_amount != null && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>1+3D Jackpot 2</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFB020", fontFamily: "var(--font-jetbrains)" }}>{revealed ? formatCurrency(data.jackpot2_amount, 2) : "—"}</span>
          </div>
        )}
        {data.jackpot3d_amount != null && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>3D Jackpot</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFB020", fontFamily: "var(--font-jetbrains)" }}>{revealed ? formatCurrency(data.jackpot3d_amount, 2) : "—"}</span>
          </div>
        )}
      </div>
      <footer style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{formatDrawDate(date)}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t("drawNoLabel")} {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
