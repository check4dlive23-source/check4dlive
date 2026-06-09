"use client";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import type { Damacai3Plus3DExtra, DrawStatus } from "@/types";

interface Damacai3Plus3DCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: Damacai3Plus3DExtra;
}

export function Damacai3Plus3DCard({ date, draw_no, status, data }: Damacai3Plus3DCardProps) {
  const { t } = useLang();
  const revealed = status !== "pending";
  return (
    <article style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(68,102,255,0.15)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #4466FF, transparent)" }} />
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(68,102,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoBadge operator="damacai" />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>DA MA CAI 3+3D 大馬彩</h3>
        </div>
        <span style={{ fontSize: 9, color: "#00E5FF", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
          {status === "drawn" ? t("completed") : t("pending")}
        </span>
      </header>
      <section style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <tbody>
            {data.prizes.map((p) => (
              <tr key={p.position} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "8px 8px 8px 0", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", width: 32 }}>{p.position}</td>
                <td style={{ padding: "8px 8px", fontFamily: "var(--font-jetbrains)", fontSize: 15, fontWeight: 700, color: revealed ? p.position === "1st" ? "#FFD700" : p.position === "2nd" ? "rgba(192,192,192,0.9)" : "rgba(205,127,50,0.9)" : "rgba(255,255,255,0.1)", whiteSpace: "nowrap" }}>
                  {revealed ? p.number : "------"}
                </td>
                <td style={{ padding: "8px 8px", fontWeight: 700, color: "#FFD700", whiteSpace: "nowrap" }}>{p.zodiac}</td>
                <td style={{ padding: "8px 0", fontSize: 11, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", textAlign: "right" }}>
                  {t("bonus")}: <span style={{ color: "#FFB020", fontFamily: "var(--font-jetbrains)" }}>{revealed ? formatCurrency(p.bonus, 2) : "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{t("specialSection")}</p>
        <div className="grid grid-cols-5 gap-1">
          {data.special.map((n, i) => (
            <span key={i} className="font-mono tabular-nums" style={{ fontSize: 12, textAlign: "center", padding: "3px 2px", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 6, color: revealed ? "rgba(0,229,255,0.9)" : "rgba(255,255,255,0.1)", display: "block" }}>
              {revealed ? n : "------"}
            </span>
          ))}
        </div>
      </section>
      <section style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{t("consolationSection")}</p>
        <div className="grid grid-cols-5 gap-1">
          {data.consolation.map((n, i) => (
            <span key={i} className="font-mono tabular-nums" style={{ fontSize: 12, textAlign: "center", padding: "3px 2px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: revealed ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.1)", display: "block" }}>
              {revealed ? n : "------"}
            </span>
          ))}
        </div>
      </section>
      <footer style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{formatDrawDate(date)}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t("drawNoLabel")} {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
