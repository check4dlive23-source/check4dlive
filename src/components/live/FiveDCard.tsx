"use client";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, Toto5DExtra } from "@/types";

interface FiveDCardProps {
  displayName: string;
  date: string;
  draw_no?: string;
  status: DrawStatus;
  prizes: Toto5DExtra;
}

const tiers = [
  { key: "first" as const, label: "1st" },
  { key: "second" as const, label: "2nd" },
  { key: "third" as const, label: "3rd" },
  { key: "fourth" as const, label: "4th" },
  { key: "fifth" as const, label: "5th" },
  { key: "sixth" as const, label: "6th" },
];

export function FiveDCard({ displayName, date, draw_no, status, prizes }: FiveDCardProps) {
  const { t } = useLang();
  const revealed = status !== "pending";
  return (
    <article style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(255,51,51,0.15)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #FF3333, transparent)" }} />
      <header style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,51,51,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoBadge operator="toto_5d" />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{displayName}</h3>
        </div>
        <span style={{ fontSize: 9, color: "#00E5FF", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 100, padding: "3px 8px", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em" }}>
          {status === "drawn" ? t("completed") : t("pending")}
        </span>
      </header>
      <section>
        {tiers.map(({ key, label }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 28, flexShrink: 0 }}>{label}</span>
            <span className="font-mono tabular-nums" style={{ fontSize: 18, fontWeight: 700, color: revealed ? "#00E5FF" : "rgba(255,255,255,0.1)", background: revealed ? "rgba(0,229,255,0.05)" : "transparent", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 8, padding: "4px 12px", flex: 1, textAlign: "center", display: "block" }}>
              {revealed ? (prizes[key]?.trim() ? prizes[key] : "—") : "----"}
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
