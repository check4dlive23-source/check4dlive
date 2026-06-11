"use client";

import Link from "next/link";
import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import type { TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/language-context";
import { SCORE_LEVELS } from "@/lib/score/config";
import type { NumberScoreRow } from "@/lib/score/compute";

export interface WatchlistItem {
  number: string;
  score: NumberScoreRow | null;
}

interface Props {
  items: WatchlistItem[];
}

function scoreColor(score: number): string {
  if (score >= SCORE_LEVELS.bullish) return "#00E5FF";
  if (score >= SCORE_LEVELS.weak) return "#FFB020";
  return "#FF4D4D";
}

function scoreLevelKey(overall: number): TranslationKey {
  if (overall >= SCORE_LEVELS.strong) return "scoreStrong";
  if (overall >= SCORE_LEVELS.bullish) return "scoreBullish";
  if (overall >= SCORE_LEVELS.neutral) return "scoreNeutral";
  if (overall >= SCORE_LEVELS.weak) return "scoreWeak";
  return "scoreCold";
}

const SCORE_PARTS = [
  { key: "scoreFreq" as const, field: "freq_score" as const },
  { key: "scoreCycle" as const, field: "cycle_score" as const },
  { key: "scoreMomentum" as const, field: "momentum_score" as const },
  { key: "scoreMirror" as const, field: "mirror_score" as const },
];

export function WatchlistView({ items: initialItems }: Props) {
  const { t } = useLang();
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (number: string) => {
    setRemoving(number);
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.number !== number));
      }
    } finally {
      setRemoving(null);
    }
  };

  return (
    <PageLayout
      title={t("watchlistTitle")}
      titleAccent=""
      subtitle={t("watchlistSubtitle")}
    >
      <p
        className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em]"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        {t("watchlistQuota")} {items.length}/5
      </p>

      {items.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-10 text-center"
          style={{
            borderColor: "rgba(0,229,255,0.08)",
            background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)",
          }}
        >
          <p
            className="mb-4 font-mono text-sm"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {t("watchlistEmpty")}
          </p>
          <Link
            href="/rankings"
            className="inline-block rounded-lg border border-line bg-surface-3 px-4 py-2 text-xs text-muted hover:border-gold/50 hover:text-gold"
          >
            {t("watchlistExplore")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const overall = item.score?.overall_score ?? null;
            const levelKey = overall !== null ? scoreLevelKey(overall) : null;
            const levelColor =
              overall !== null ? scoreColor(overall) : "rgba(255,255,255,0.3)";

            return (
              <div
                key={item.number}
                style={{
                  background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)",
                  border: "1px solid rgba(0,229,255,0.08)",
                  borderRadius: 12,
                  padding: "12px 16px",
                }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/number/${item.number}`}
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#00E5FF",
                      letterSpacing: "0.08em",
                      textDecoration: "none",
                    }}
                  >
                    {item.number}
                  </Link>
                  <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                    {overall !== null ? (
                      <>
                        <span
                          className="font-mono tabular-nums"
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: levelColor,
                          }}
                        >
                          {overall}
                        </span>
                        {levelKey && (
                          <span
                            style={{
                              fontSize: 9,
                              fontFamily: "var(--font-jetbrains)",
                              letterSpacing: "0.1em",
                              color: levelColor,
                              background: `${levelColor}18`,
                              border: `1px solid ${levelColor}40`,
                              borderRadius: 6,
                              padding: "3px 8px",
                            }}
                          >
                            {t(levelKey)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span
                        className="font-mono text-xs"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {t("scoreNoData")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.number)}
                    disabled={removing === item.number}
                    className="shrink-0 rounded-lg border border-line bg-surface-3 px-3 py-1.5 text-xs text-muted hover:border-gold/50 hover:text-gold disabled:opacity-60"
                  >
                    {removing === item.number
                      ? t("loginLoading")
                      : t("watchRemove")}
                  </button>
                </div>

                {item.score && (
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                    {SCORE_PARTS.map((p) => {
                      const val = item.score![p.field];
                      return (
                        <div
                          key={p.key}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="w-10 shrink-0 font-mono text-[8px]"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                          >
                            {t(p.key)}
                          </span>
                          <div
                            className="h-1 flex-1 rounded"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >
                            <div
                              className="h-1 rounded"
                              style={{
                                width: `${val}%`,
                                backgroundColor: scoreColor(val),
                              }}
                            />
                          </div>
                          <span
                            className="w-4 shrink-0 text-right font-mono text-[8px]"
                            style={{ color: "rgba(255,255,255,0.45)" }}
                          >
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
