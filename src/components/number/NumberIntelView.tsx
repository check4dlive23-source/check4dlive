"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { HeatBadge } from "./HeatBadge";
import { NumberSearchBar } from "./NumberSearchBar";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import { parsePosition } from "@/lib/number-intelligence";
import type { NumberIntelligenceResponse } from "@/types/number-intelligence";

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

const OPERATOR_LOGOS: Record<string, string> = {
  magnum: "/logos/magnum.gif",
  damacai: "/logos/damacai.gif",
  toto: "/logos/toto.gif",
  cashsweep: "/logos/cashsweep.gif",
  sarawak: "/logos/cashsweep.gif",
  sabah: "/logos/sabah88.gif",
  sandakan: "/logos/sandakan.gif",
  singapore: "/logos/sgpools.gif",
  sgpools: "/logos/sgpools.gif",
};

const SEARCH_OPERATORS = [
  { id: "magnum", logo: "/logos/magnum.gif" },
  { id: "damacai", logo: "/logos/damacai.gif" },
  { id: "toto", logo: "/logos/toto.gif" },
  { id: "cashsweep", logo: "/logos/cashsweep.gif" },
  { id: "sabah", logo: "/logos/sabah88.gif" },
  { id: "sandakan", logo: "/logos/sandakan.gif" },
  { id: "singapore", logo: "/logos/sgpools.gif" },
] as const;

function OperatorLogo({
  operatorKey,
  height = 20,
}: {
  operatorKey: string;
  height?: number;
}) {
  const src = OPERATOR_LOGOS[operatorKey];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={operatorKey}
      style={{ height, width: "auto", display: "block" }}
    />
  );
}

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
  operators?: string[];
}

export function NumberIntelView({ data, operators = [] }: NumberIntelViewProps) {
  const { t } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const { stats, extras } = data;

  const toggleOperator = (id: string) => {
    const next = operators.includes(id)
      ? operators.filter((op) => op !== id)
      : [...operators, id];
    const url =
      next.length > 0
        ? `${pathname}?operators=${next.join(",")}`
        : pathname;
    router.push(url);
  };

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
              <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {SEARCH_OPERATORS.map((op) => {
                  const active = operators.includes(op.id);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => toggleOperator(op.id)}
                      className="shrink-0 rounded"
                      style={{
                        padding: "6px 10px",
                        border: active
                          ? "1px solid var(--cyan)"
                          : "1px solid var(--border-dim)",
                        background: active
                          ? "rgba(0,229,255,0.08)"
                          : "transparent",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={op.logo}
                        alt={op.id}
                        style={{ height: 20, width: "auto", display: "block" }}
                      />
                    </button>
                  );
                })}
              </div>
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

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            {t("recentAppearances")}
          </h2>
          <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto max-h-[480px] overflow-y-auto">
            {data.history.items.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("noResults")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-2 z-10">
                  <tr className="border-b border-line text-left text-muted text-xs uppercase">
                    <th className="px-3 py-2">{t("dateLabel")}</th>
                    <th className="px-3 py-2">{t("operator")}</th>
                    <th className="px-3 py-2">{t("prizePosition")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.items.map((row, i) => (
                    <tr
                      key={`${row.date}-${row.operator}-${i}`}
                      className="border-b border-line/50"
                    >
                      <td className="px-3 py-2 text-foreground">
                        {formatDrawDate(row.date)}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <OperatorLogo operatorKey={row.operator} />
                          <span>
                            {OPERATOR_LABELS[row.operator] ?? row.operator}
                          </span>
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 font-medium ${
                          POSITION_COLORS[row.position_tier]
                        }`}
                      >
                        {row.position_label}
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
