"use client";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, Sabah3DExtra } from "@/types";

interface Sabah3DCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: Sabah3DExtra;
}

export function Sabah3DCard({ date, draw_no, status, data }: Sabah3DCardProps) {
  const { t } = useLang();
  const revealed = status !== "pending";
  return (
    <article style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(180,83,9,0.2)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #F59E0B, transparent)" }} />
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(180,83,9,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoBadge operator="sabah" />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Sabah 3D</h3>
        </div>
        <span style={{ fontSize: 9, color: "#00E5FF", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
          {status === "drawn" ? t("completed") : t("pending")}
        </span>
      </header>
      <div className="grid grid-cols-3 gap-2" style={{ padding: "14px" }}>
        {[
          { label: "1st", value: data.first, color: "#FFD700" },
          { label: "2nd", value: data.second, color: "rgba(192,192,192,0.9)" },
          { label: "3rd", value: data.third, color: "rgba(205,127,50,0.9)" },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{item.label}</p>
            <span className="font-mono tabular-nums" style={{ fontSize: 28, fontWeight: 900, color: revealed ? item.color : "rgba(255,255,255,0.1)" }}>
              {revealed ? item.value : "---"}
            </span>
          </div>
        ))}
      </div>
      <footer style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{formatDrawDate(date)}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t("drawNoLabel")} {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
