"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { HeatBadge } from "./HeatBadge";
import { NumberSearchBar } from "./NumberSearchBar";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import { parsePosition } from "@/lib/number-intelligence";
import type { NumberIntelligenceResponse } from "@/types/number-intelligence";

const AppearanceTimeline = dynamic(
  () => import("./AppearanceTimeline").then((m) => m.AppearanceTimeline),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-sm text-muted">
        Loading chart…
      </div>
    ),
  }
);

const POSITION_COLORS: Record<string, string> = {
  first: "text-gold",
  second: "text-slate-300",
  third: "text-amber-700",
  special: "text-sky-400",
  consolation: "text-muted",
};

const OPERATOR_LABELS: Record<string, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Sports Toto",
  sabah: "Sabah",
  sarawak: "Cash Sweep",
  sandakan: "Sandakan",
  gd: "Grand Dragon",
  perdana: "Perdana",
  hari: "Lucky Hari Hari",
  sgpools: "Singapore Pools",
};

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-surface-3 px-3 py-2 text-center">
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className="font-number text-lg text-foreground mt-0.5">{value}</p>
    </div>
  );
}

interface NumberIntelViewProps {
  data: NumberIntelligenceResponse;
}

export function NumberIntelView({ data }: NumberIntelViewProps) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const { stats, extras } = data;
  const lastPos = stats.last_seen_position
    ? parsePosition(stats.last_seen_position).label
    : "—";
  const lastOp = stats.last_seen_operator
    ? OPERATOR_LABELS[stats.last_seen_operator] ?? stats.last_seen_operator
    : "—";

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-surface-2">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link
            href="/"
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            ← Check4D Live
          </Link>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">
                {t("numberIntelligence")}
              </p>
              <h1 className="font-number text-5xl md:text-6xl font-bold text-gold tracking-[0.2em]">
                {data.number}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <HeatBadge level={stats.heat_level} />
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="rounded-lg border border-line bg-surface-3 px-3 py-1.5 text-xs text-muted hover:border-gold/50 hover:text-gold"
              >
                {copied ? t("copiedLink") : t("shareAnalysis")}
              </button>
            </div>
          </div>
          <div className="mt-4">
            <NumberSearchBar currentNumber={data.number} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-8">
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            {t("overview")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <StatCell label={t("totalHitsEver")} value={stats.total_hits} />
            <StatCell label={t("firstPrize")} value={stats.first_prize_hits} />
            <StatCell label={t("secondPrize")} value={stats.second_prize_hits} />
            <StatCell label={t("thirdPrize")} value={stats.third_prize_hits} />
            <StatCell label={t("special")} value={stats.special_hits} />
            <StatCell label={t("consolation")} value={stats.consolation_hits} />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
              <span className="text-muted">{t("lastSeen")}: </span>
              <span className="text-foreground">
                {stats.last_seen_date
                  ? `${formatDrawDate(stats.last_seen_date)} · ${lastOp} · ${lastPos}`
                  : t("never")}
              </span>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
              <span className="text-muted">{t("currentGap")}: </span>
              <span className="text-foreground font-number">
                {stats.current_gap_days != null
                  ? `${stats.current_gap_days} ${t("days")}`
                  : "—"}
              </span>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
              <span className="text-muted">{t("avgGap")}: </span>
              <span className="text-foreground font-number">
                {stats.avg_gap_days != null
                  ? `${stats.avg_gap_days} ${t("days")}`
                  : "—"}
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <h2 className="text-sm font-semibold text-foreground mb-2">
              {t("winProbability")}
            </h2>
            <p className="text-sm text-muted">
              {t("winProbabilityDesc")
                .replace("{total}", String(extras.total_draws_analyzed))
                .replace("{hits}", String(stats.total_hits))
                .replace("{pct}", extras.win_probability_pct.toFixed(2))}
            </p>
            <p className="font-number text-3xl text-gold mt-2">
              {extras.win_probability_pct.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <h2 className="text-sm font-semibold text-foreground mb-2">
              {t("predictedNext")}
            </h2>
            {extras.predicted_next_date ? (
              <p className="text-sm text-muted">
                {t("predictedNextDesc")
                  .replace("{days}", String(stats.avg_gap_days ?? "—"))
                  .replace(
                    "{date}",
                    formatDrawDate(extras.predicted_next_date)
                  )}
              </p>
            ) : (
              <p className="text-sm text-muted">—</p>
            )}
            <p className="text-[10px] text-dim mt-3">{t("disclaimer")}</p>
          </div>
        </section>

        {extras.related_numbers.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              {t("relatedNumbers")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {extras.related_numbers.map((r) => (
                <Link
                  key={r.number}
                  href={`/number/${r.number}`}
                  className="rounded-lg border border-line bg-surface-2 px-3 py-2 hover:border-gold/40"
                >
                  <span className="font-number text-lg text-gold">{r.number}</span>
                  <span className="block text-[10px] text-muted">
                    {r.reason === "same_last2"
                      ? t("sameLast2")
                      : t("permutation")}{" "}
                    · {r.total_hits} {t("hits")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            {t("appearanceTimeline")}
          </h2>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <AppearanceTimeline data={data.timeline} />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            {t("breakdownByOperator")}
          </h2>
          <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto">
            {data.breakdown.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("noResults")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted text-xs uppercase">
                    <th className="px-3 py-2">{t("operator")}</th>
                    <th className="px-3 py-2 text-center">{t("totalHits")}</th>
                    <th className="px-3 py-2 text-center">{t("firstHits")}</th>
                    <th className="px-3 py-2 text-center">{t("secondHits")}</th>
                    <th className="px-3 py-2 text-center">{t("thirdHits")}</th>
                    <th className="px-3 py-2 text-center">{t("special")}</th>
                    <th className="px-3 py-2 text-center">{t("consolation")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((row) => (
                    <tr key={row.operator} className="border-b border-line/50">
                      <td className="px-3 py-2 font-medium text-foreground">
                        {row.label}
                      </td>
                      <td className="px-3 py-2 text-center font-number">
                        {row.total}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-gold">
                        {row.first}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-slate-300">
                        {row.second}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-amber-600">
                        {row.third}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-sky-400">
                        {row.special}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-muted">
                        {row.consolation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            {t("recentAppearances")}
          </h2>
          <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto">
            {data.recent.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("noResults")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted text-xs uppercase">
                    <th className="px-3 py-2">{t("dateLabel")}</th>
                    <th className="px-3 py-2">{t("operator")}</th>
                    <th className="px-3 py-2">{t("prizePosition")}</th>
                    <th className="px-3 py-2">{t("drawNoCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row, i) => (
                    <tr
                      key={`${row.date}-${row.operator}-${i}`}
                      className="border-b border-line/50"
                    >
                      <td className="px-3 py-2 text-foreground">
                        {formatDrawDate(row.date)}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {OPERATOR_LABELS[row.operator] ?? row.operator}
                      </td>
                      <td
                        className={`px-3 py-2 font-medium ${
                          POSITION_COLORS[row.position_tier]
                        }`}
                      >
                        {row.position_label}
                      </td>
                      <td className="px-3 py-2 font-number text-muted">
                        {row.draw_no ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
