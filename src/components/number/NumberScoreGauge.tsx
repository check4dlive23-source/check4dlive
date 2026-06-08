"use client";

import { useMemo } from "react";
import type { NumberStatsPayload } from "@/types/number-intelligence";

interface Props {
  stats: NumberStatsPayload;
}

// 计算 0-100 综合评分
function computeScore(stats: NumberStatsPayload): number {
  // Frequency score (40%): total_hits 相对基准
  // 基准：马来西亚4D平均每号码出现约 50 次（40年数据）
  const freqScore = Math.min(100, (stats.total_hits / 80) * 100);

  // Recency score (35%): 距离上次出现天数
  // gap 越小分越高，超过 365 天给 0 分
  const gap = stats.current_gap_days ?? 365;
  const recencyScore = Math.max(0, Math.min(100, ((365 - gap) / 365) * 100));

  // Momentum score (25%): 当前 gap vs 平均 gap
  // 当前 gap < 平均 gap → 表现优于历史，给高分
  const avgGap = stats.avg_gap_days ?? gap;
  const momentumScore =
    avgGap > 0
      ? Math.max(0, Math.min(100, ((avgGap - gap) / avgGap + 1) * 50))
      : 50;

  return Math.round(freqScore * 0.4 + recencyScore * 0.35 + momentumScore * 0.25);
}

function scoreColor(score: number): string {
  if (score >= 70) return "#00E5FF";
  if (score >= 40) return "#FFB020";
  return "#FF4D4D";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "STRONG";
  if (score >= 70) return "BULLISH";
  if (score >= 50) return "NEUTRAL";
  if (score >= 40) return "WEAK";
  return "COLD";
}

export function NumberScoreGauge({ stats }: Props) {
  const score = useMemo(() => computeScore(stats), [stats]);
  const color = scoreColor(score);
  const label = scoreLabel(score);

  // SVG 圆弧参数
  const radius = 36;
  const circumference = Math.PI * radius; // 半圆
  const strokeDashoffset = circumference * (1 - score / 100);

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
        {/* 背景弧 */}
        <path
          d="M 12 48 A 36 36 0 0 1 84 48"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* 分数弧 */}
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
        {/* 分数数字 */}
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
          {score}
        </text>
      </svg>
      {/* 标签 */}
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
        NUMBER SCORE
      </div>
    </div>
  );
}
