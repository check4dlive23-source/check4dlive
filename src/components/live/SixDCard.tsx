"use client";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, Toto6DTier } from "@/types";

interface SixDCardProps {
  displayName: string;
  subtitle?: string;
  date: string;
  draw_no?: string;
  status: DrawStatus;
  tiers: Toto6DTier[];
}

export function SixDCard({ displayName, subtitle, date, draw_no, status, tiers }: SixDCardProps) {
  const { t } = useLang();
  const revealed = status === "drawn";
  return (
    <article style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(255,51,51,0.15)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #FF3333, transparent)" }} />
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,51,51,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoBadge operator="toto_6d" />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{displayName}</h3>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{subtitle ?? t("bothSidesWin")}</p>
        </div>
        <span style={{ fontSize: 9, color: "#00E5FF", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
          {status === "drawn"
            ? t("completed")
            : status === "live"
              ? t("liveDrawing")
              : t("noLiveData")}
        </span>
      </header>
      <section>
        {tiers.map((tier) => (
          <div key={tier.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 32, flexShrink: 0 }}>{tier.label}</span>
            <span className="font-mono tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: revealed ? "#00E5FF" : "rgba(255,255,255,0.1)", flex: 1, textAlign: "center", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 8, padding: "4px 8px" }}>
              {!revealed
                ? "----"
                : tier.front
                  ? tier.label === "1st"
                    ? tier.front
                    : (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <span style={{ fontFamily: "var(--font-jetbrains)", letterSpacing: "0.05em" }}>{tier.front}</span>
                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}>OR</span>
                          <span style={{ fontFamily: "var(--font-jetbrains)", letterSpacing: "0.05em" }}>{tier.back}</span>
                        </span>
                      )
                  : "—"}
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
