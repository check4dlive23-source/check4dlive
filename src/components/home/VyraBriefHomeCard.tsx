"use client";

import Link from "next/link";
import { useState } from "react";
import { saveBriefRegion } from "@/app/brief/BriefRegionRedirect";
import { useLang } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { formatDrawDate } from "@/lib/number-utils";
import { todayMYT } from "@/lib/draw-time";
import type { VyraBriefRow } from "@/lib/vyra/brief-queries";
import type { VyraRegion } from "@/lib/vyra/types";

const REGIONS: VyraRegion[] = ["west", "east", "singapore"];

const SIGNAL_ICONS = ["⚡", "🧊", "↗", "🔁"] as const;

type BriefsByRegion = Record<
  VyraRegion,
  { zh: VyraBriefRow | null; en: VyraBriefRow | null }
>;

interface VyraBriefHomeCardProps {
  briefsByRegion: BriefsByRegion;
}

export function VyraBriefHomeCard({ briefsByRegion }: VyraBriefHomeCardProps) {
  const { t, lang } = useLang();
  const [region, setRegion] = useState<VyraRegion>("west");

  const pack = briefsByRegion[region];
  const brief =
    lang === "zh"
      ? pack.zh ?? pack.en
      : pack.en ?? pack.zh;

  const today = todayMYT();
  const isStale = brief != null && brief.brief_date !== today;
  const preview = brief?.signals.slice(0, 3) ?? [];

  return (
    <section style={{ padding: "0 22px", marginBottom: 24 }}>
      <div
        style={{
          borderRadius: 14,
          border: "1px solid rgba(167,139,250,0.2)",
          borderLeft: "2px solid #A78BFA",
          background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(10,14,26,0.95))",
          padding: "16px",
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "white",
              fontFamily: "var(--font-jetbrains)",
            }}
          >
            <span style={{ color: "#A78BFA", marginRight: 6 }}>◤</span>
            VYRA
          </h2>
          <div className="flex gap-1">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRegion(r);
                  saveBriefRegion(r);
                }}
                style={{
                  fontSize: 9,
                  padding: "4px 8px",
                  borderRadius: 100,
                  border:
                    r === region
                      ? "1px solid rgba(167,139,250,0.45)"
                      : "1px solid rgba(255,255,255,0.08)",
                  background:
                    r === region ? "rgba(167,139,250,0.15)" : "transparent",
                  color: r === region ? "#A78BFA" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {r === "west" ? "西" : r === "east" ? "东" : "SG"}
              </button>
            ))}
          </div>
        </div>

        {!brief ? (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            {t("vyraBriefEmpty")}
          </p>
        ) : (
          <>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
              {formatDrawDate(brief.brief_date)}
              {isStale ? ` · ${t("vyraBriefLatestArchive")}` : ""}
            </p>
            {brief.intro && (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 10, lineHeight: 1.5 }}>
                {brief.intro}
              </p>
            )}
            <div className="space-y-2">
              {preview.map((signal, i) => {
                const locked = i >= 2;
                const seg = brief.narrative.find((n) => n.signalIndex === i);
                const labelKey: Record<string, TranslationKey> = {
                  digit_surge: "vyraSignalDigitSurge",
                  overdue: "vyraSignalOverdue",
                  score_jump: "vyraSignalScoreJump",
                  mirror_sync: "vyraSignalMirrorSync",
                };
                return (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-lg"
                    style={{
                      padding: "8px 10px",
                      background: "rgba(167,139,250,0.06)",
                      userSelect: locked ? "none" : "auto",
                    }}
                  >
                    <div style={{ filter: locked ? "blur(6px)" : "none" }}>
                      <span style={{ marginRight: 6 }}>{SIGNAL_ICONS[i] ?? "·"}</span>
                      <span style={{ fontSize: 10, color: "#A78BFA" }}>
                        {t(labelKey[signal.type] ?? "vyraSignalDigitSurge")}
                      </span>
                      {seg?.text && (
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
                          {seg.text}
                        </p>
                      )}
                    </div>
                    {locked && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(7,7,16,0.5)", fontSize: 10, color: "rgba(255,255,255,0.5)" }}
                      >
                        🔒 Pro
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-3 flex gap-2">
          <Link
            href="/pro"
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11,
              padding: "8px",
              borderRadius: 8,
              border: "1px solid rgba(167,139,250,0.35)",
              color: "#A78BFA",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("vyraBriefUnlockPro")}
          </Link>
          <Link
            href={`/brief/${region}`}
            onClick={() => saveBriefRegion(region)}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11,
              padding: "8px",
              borderRadius: 8,
              background: "rgba(167,139,250,0.12)",
              border: "1px solid rgba(167,139,250,0.25)",
              color: "white",
              textDecoration: "none",
            }}
          >
            {t("vyraBriefViewFull")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
