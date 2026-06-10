"use client";

import { useLang } from "@/lib/language-context";
import { SCORE_LEVELS } from "@/lib/score/config";
import type { NumberScoreRow } from "@/lib/score/compute";

interface Props {
  score: NumberScoreRow | null;
}

function scoreColor(score: number): string {
  if (score >= SCORE_LEVELS.bullish) return "#00E5FF";
  if (score >= SCORE_LEVELS.weak) return "#FFB020";
  return "#FF4D4D";
}

export function NumberScoreGauge({ score }: Props) {
  const { t } = useLang();

  if (!score) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 22,
            fontWeight: 900,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          —
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 9,
            letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          {t("scoreNoData")}
        </div>
      </div>
    );
  }

  const overall = score.overall_score;
  const color = scoreColor(overall);
  const label = (() => {
    if (overall >= SCORE_LEVELS.strong) return t("scoreStrong");
    if (overall >= SCORE_LEVELS.bullish) return t("scoreBullish");
    if (overall >= SCORE_LEVELS.neutral) return t("scoreNeutral");
    if (overall >= SCORE_LEVELS.weak) return t("scoreWeak");
    return t("scoreCold");
  })();

  const radius = 36;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - overall / 100);

  const parts = [
    { key: "scoreFreq", value: score.freq_score },
    { key: "scoreCycle", value: score.cycle_score },
    { key: "scoreMomentum", value: score.momentum_score },
    { key: "scoreMirror", value: score.mirror_score },
  ] as const;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <svg width="96" height="56" viewBox="0 0 96 56">
        <path
          d="M 12 48 A 36 36 0 0 1 84 48"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 12 48 A 36 36 0 0 1 84 48"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
            transition: "stroke-dashoffset 0.8s ease",
          }}
        />
        <text
          x="48"
          y="44"
          textAnchor="middle"
          fill={color}
          style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          {overall}
        </text>
      </svg>
      <div
        style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 9,
          letterSpacing: "0.2em",
          color,
          opacity: 0.9,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 8,
          letterSpacing: "0.15em",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        {t("numberScore")}
      </div>
      <div style={{ marginTop: 4, width: 120, display: "flex", flexDirection: "column", gap: 4 }}>
        {parts.map((p) => (
          <div
            key={p.key}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 44,
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 9,
                color: "rgba(255,255,255,0.35)",
              }}
            >
              {t(p.key)}
            </span>
            <div
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  width: `${p.value}%`,
                  backgroundColor: scoreColor(p.value),
                }}
              />
            </div>
            <span
              style={{
                width: 18,
                textAlign: "right",
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 9,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
