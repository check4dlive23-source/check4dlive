"use client";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, MagnumLifeExtra } from "@/types";

interface MagnumLifeCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: MagnumLifeExtra | null;
}

export function MagnumLifeCard({ date, draw_no, status, data }: MagnumLifeCardProps) {
  const { t } = useLang();
  const revealed = status !== "pending";
  const winning = data?.winning ?? Array(8).fill(0);
  const bonus = data?.bonus ?? [0, 0];
  return (
    <article style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #FFD700, transparent)" }} />
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,215,0,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoBadge operator="magnum_life" />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Magnum Life</h3>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>8 winning + 2 bonus (1–36)</p>
        </div>
        <span style={{ fontSize: 9, color: "#00E5FF", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
          {status === "drawn" ? t("completed") : t("pending")}
        </span>
      </header>
      <section style={{ padding: "14px" }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{t("winningNumbers")}</p>
        <div className="flex flex-wrap items-center justify-center gap-2" style={{ marginBottom: 16 }}>
          {winning.map((n, i) => (
            <span key={`w-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", background: revealed ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)", border: revealed ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.1)", fontSize: 14, fontWeight: 700, color: revealed ? "white" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains)" }}>
              {revealed ? n > 0 ? n : "—" : "—"}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{t("bonus")}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {bonus.map((n, i) => (
            <span key={`b-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", background: revealed ? "rgba(255,176,32,0.15)" : "rgba(255,255,255,0.05)", border: revealed ? "2px solid #FFB020" : "1px solid rgba(255,255,255,0.1)", fontSize: 14, fontWeight: 700, color: revealed ? "#FFB020" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains)" }}>
              {revealed ? n > 0 ? n : "—" : "—"}
            </span>
          ))}
        </div>
      </section>
      <footer style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{formatDrawDate(date)}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t("drawNoLabel")} {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
