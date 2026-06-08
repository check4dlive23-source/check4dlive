"use client";

import { usePathname, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { NumberScoreGauge } from "./NumberScoreGauge";
import { NumberSearchBar } from "./NumberSearchBar";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import { parsePosition } from "@/lib/number-intelligence";
import type {
  NumberIntelMode,
  NumberIntelligenceResponse,
} from "@/types/number-intelligence";

const POSITION_COLORS: Record<string, string> = {
  first: "text-[#FFD700]", // 金色 — 头奖
  second: "text-[#C0C0C0]", // 银色 — 二奖
  third: "text-[#CD7F32]", // 铜色 — 三奖
  special: "text-[var(--cyan)]", // 青色 — 特别奖
  consolation: "text-[var(--text-secondary)]", // 灰色 — 安慰奖
};

const OPERATOR_LABELS: Record<string, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Toto",
  sabah: "Sabah",
  sabah88: "Sabah 88",
  sarawak: "Cash Sweep",
  cashsweep: "Cash Sweep",
  sandakan: "Sandakan",
  stc: "Sandakan 4D",
  gd: "GD Lotto",
  perdana: "Perdana",
  hari: "Lucky HH",
  sgpools: "SG Pools",
  singapore: "SG Pools",
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

const MODE_OPTIONS: { id: NumberIntelMode; labelKey: "modeSingle" | "modeReverse" | "modeFull" }[] = [
  { id: "single", labelKey: "modeSingle" },
  { id: "reverse", labelKey: "modeReverse" },
  { id: "full", labelKey: "modeFull" },
];

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
      style={{ height, width: "auto", maxWidth: 28, display: "block", objectFit: "contain" }}
    />
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="px-3 py-2 text-center"
      style={{
        background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)",
        border: "1px solid rgba(0,229,255,0.1)",
        borderRadius: 12,
      }}
    >
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{label}</p>
      <p
        className="font-number mt-0.5"
        style={{ fontSize: 28, fontWeight: 800, color: "white" }}
      >
        {value}
      </p>
    </div>
  );
}

interface NumberIntelViewProps {
  data: NumberIntelligenceResponse;
  operators?: string[];
  mode?: NumberIntelMode;
}

function buildNumberPageUrl(
  pathname: string,
  operators: string[],
  mode: NumberIntelMode
): string {
  const params = new URLSearchParams();
  if (operators.length > 0) {
    params.set("operators", operators.join(","));
  }
  if (mode !== "single") {
    params.set("mode", mode);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function NumberIntelView({
  data,
  operators = [],
  mode = "single",
}: NumberIntelViewProps) {
  const { t } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const { stats } = data;
  const historyGroups = data.history.groups;

  const toggleOperator = (id: string) => {
    const next = operators.includes(id)
      ? operators.filter((op) => op !== id)
      : [...operators, id];
    router.push(buildNumberPageUrl(pathname, next, mode));
  };

  const setMode = (nextMode: NumberIntelMode) => {
    router.push(buildNumberPageUrl(pathname, operators, nextMode));
  };

  const translatePosition = (label: string) => {
    if (label === "1st Prize") return t("prize1st");
    if (label === "2nd Prize") return t("prize2nd");
    if (label === "3rd Prize") return t("prize3rd");
    if (label === "Special") return t("prizeSpecial");
    if (label === "Consolation") return t("prizeConsolation");
    return label;
  };

  const lastPos = translatePosition(
    parsePosition(stats.last_seen_position ?? "").label
  );
  const lastOp = stats.last_seen_operator
    ? OPERATOR_LABELS[stats.last_seen_operator] ?? stats.last_seen_operator
    : "—";

  return (
    <PageLayout
      title="4D "
      titleAccent="INTEL"
      subtitle="INTELLIGENCE · 40 YEARS DATA"
      showBack
    >
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1
                className="font-number text-5xl md:text-6xl font-bold tracking-[0.2em]"
                style={{ color: "#00E5FF" }}
              >
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
              <div className="mt-2 flex gap-1.5">
                {MODE_OPTIONS.map((opt) => {
                  const active = mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMode(opt.id)}
                      className="rounded text-xs font-medium px-3 py-1.5 transition-colors"
                      style={{
                        border: active
                          ? "1px solid var(--cyan)"
                          : "1px solid var(--border-dim)",
                        background: active
                          ? "rgba(0,229,255,0.08)"
                          : "transparent",
                        color: active ? "var(--cyan)" : "var(--text-muted)",
                      }}
                    >
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <NumberScoreGauge stats={stats} />
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
            <div className="subpage-card px-3 py-2">
              <span className="text-muted">{t("lastSeen")}: </span>
              <span className="text-foreground">
                {stats.last_seen_date
                  ? `${formatDrawDate(stats.last_seen_date)} · ${lastOp} · ${lastPos}`
                  : t("never")}
              </span>
            </div>
            <div className="subpage-card px-3 py-2">
              <span className="text-muted">{t("currentGap")}: </span>
              <span className="text-foreground font-number">
                {stats.current_gap_days != null
                  ? `${stats.current_gap_days} ${t("days")}`
                  : "—"}
              </span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            {t("recentAppearances")}
          </h2>
          <div className="subpage-card overflow-x-auto max-h-[480px] overflow-y-auto">
            {historyGroups.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("noResults")}</p>
            ) : (
              <table className="w-full text-sm" style={{ minWidth: 320 }}>
                <thead
                  className="sticky top-0 z-10"
                  style={{
                    background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)",
                  }}
                >
                  <tr className="border-b border-line text-left text-muted text-xs uppercase">
                    <th className="px-3 py-2" style={{ width: 85 }}>
                      {t("dateLabel")}
                    </th>
                    <th className="px-3 py-2" style={{ width: 50 }}>
                      {t("number")}
                    </th>
                    <th className="px-3 py-2" style={{ width: 110 }}>
                      {t("operator")}
                    </th>
                    <th className="px-3 py-2" style={{ width: 75 }}>
                      {t("prizePosition")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyGroups.map((group) => (
                    <Fragment key={group.number}>
                      <tr className="border-t border-line">
                        <td colSpan={4} className="px-3 py-2">
                          <span
                            className="font-mono text-sm tabular-nums"
                            style={{
                              color:
                                group.items.length > 0
                                  ? "var(--cyan)"
                                  : "var(--text-dim)",
                            }}
                          >
                            {group.number}
                            {" — "}
                            {group.items.length > 0
                              ? t("historyGroupCount").replace(
                                  "{count}",
                                  String(group.items.length)
                                )
                              : t("historyGroupEmpty")}
                          </span>
                        </td>
                      </tr>
                      {group.items.map((row, i) => (
                        <tr
                          key={`${group.number}-${row.date}-${row.operator}-${i}`}
                          className="border-b border-line/50"
                        >
                          <td className="px-2 py-2 font-mono text-[11px] tabular-nums">
                            {formatDrawDate(row.date)}
                          </td>
                          <td
                            className="px-2 py-2 font-mono tabular-nums"
                            style={{ color: "var(--cyan)" }}
                          >
                            {group.number}
                          </td>
                          <td className="px-2 py-2 text-foreground">
                            <span className="inline-flex items-center gap-2">
                              <OperatorLogo operatorKey={row.operator} />
                              <span className="whitespace-nowrap">
                                {OPERATOR_LABELS[row.operator] ?? row.operator}
                              </span>
                            </span>
                          </td>
                          <td
                            className={`px-2 py-2 font-medium whitespace-nowrap ${
                              POSITION_COLORS[row.position_tier]
                            }`}
                          >
                            {translatePosition(row.position_label)}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
        </div>
    </PageLayout>
  );
}
