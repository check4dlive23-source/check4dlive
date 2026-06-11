"use client";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { NumberScoreGauge } from "./NumberScoreGauge";
import { NumberSearchBar } from "./NumberSearchBar";
import { WatchButton } from "@/components/watchlist/WatchButton";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import { parsePosition } from "@/lib/number-intelligence";
import type { NumberScoreRow } from "@/lib/score/compute";
import type {
  NumberIntelMode,
  NumberIntelligenceResponse,
} from "@/types/number-intelligence";

const POSITION_COLORS: Record<string, string> = {
  first: "text-[#FFD700]",
  second: "text-[#C0C0C0]",
  third: "text-[#CD7F32]",
  special: "text-[var(--cyan)]",
  consolation: "text-[var(--text-secondary)]",
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

function OperatorLogo({ operatorKey, height = 20 }: { operatorKey: string; height?: number }) {
  const src = OPERATOR_LOGOS[operatorKey];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={operatorKey} style={{ height, width: "auto", maxWidth: 28, display: "block", objectFit: "contain" }} />
  );
}

function StatCell({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="px-3 py-2 text-center" style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12 }}>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{label}</p>
      <p className="font-number mt-0.5" style={{ fontSize: 28, fontWeight: 800, color: accent ? "#00E5FF" : "white" }}>{value}</p>
    </div>
  );
}

function CycleCell({ label, value, unit, highlight }: { label: string; value: string | number | null; unit?: string; highlight?: boolean }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: `1px solid ${highlight ? "rgba(0,229,255,0.3)" : "rgba(0,229,255,0.08)"}`, borderRadius: 12, padding: "12px 16px" }}>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
      <p className="font-number" style={{ fontSize: 24, fontWeight: 800, color: highlight ? "#00E5FF" : "white" }}>
        {value ?? "—"}{value != null && unit ? <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>{unit}</span> : null}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
      {children}
    </h2>
  );
}

function buildNumberPageUrl(pathname: string, operators: string[], mode: NumberIntelMode): string {
  const params = new URLSearchParams();
  if (operators.length > 0) params.set("operators", operators.join(","));
  if (mode !== "single") params.set("mode", mode);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function generateAiInsight(
  number: string,
  stats: NumberIntelligenceResponse["stats"],
  lang: string
): string {
  const hits = stats.total_hits;
  const gap = stats.current_gap_days;
  const avg = stats.avg_gap_days;
  const lastDate = stats.last_seen_date ? formatDrawDate(stats.last_seen_date) : null;

  if (lang === "zh") {
    let text = `${number} 历史共出现 ${hits} 次。`;
    if (lastDate) text += `最近一次出现于 ${lastDate}。`;
    if (gap != null && avg != null) {
      if (gap < avg) text += `当前间隔 ${gap} 天，低于历史平均 ${avg} 天，处于活跃周期。`;
      else if (gap > avg * 1.5) text += `当前间隔 ${gap} 天，已超过历史平均 ${avg} 天的 1.5 倍，处于冷藏期。`;
      else text += `当前间隔 ${gap} 天，接近历史平均 ${avg} 天。`;
    }
    if (stats.first_prize_hits > 0) text += `历史一等奖 ${stats.first_prize_hits} 次。`;
    return text;
  } else {
    let text = `${number} has appeared ${hits} times historically.`;
    if (lastDate) text += ` Last seen on ${lastDate}.`;
    if (gap != null && avg != null) {
      if (gap < avg) text += ` Current gap of ${gap} days is below the historical average of ${avg} days — active cycle.`;
      else if (gap > avg * 1.5) text += ` Current gap of ${gap} days has exceeded 1.5× the historical average of ${avg} days — cold period.`;
      else text += ` Current gap of ${gap} days is near the historical average of ${avg} days.`;
    }
    if (stats.first_prize_hits > 0) text += ` ${stats.first_prize_hits} historical 1st Prize win(s).`;
    return text;
  }
}

interface NumberIntelViewProps {
  data: NumberIntelligenceResponse;
  score: NumberScoreRow | null;
  operators?: string[];
  mode?: NumberIntelMode;
}

export function NumberIntelView({
  data,
  score,
  operators = [],
  mode = "single",
}: NumberIntelViewProps) {
  const { t, lang } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const { stats } = data;
  const historyGroups = data.history.groups;

  const toggleOperator = (id: string) => {
    const next = operators.includes(id) ? operators.filter((op) => op !== id) : [...operators, id];
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

  const lastPos = translatePosition(parsePosition(stats.last_seen_position ?? "").label);
  const lastOp = stats.last_seen_operator
    ? OPERATOR_LABELS[stats.last_seen_operator] ?? stats.last_seen_operator
    : "—";

  const relatedNumbers = data.extras.related_numbers.slice(0, 8);
  const breakdown = data.breakdown.filter((b) => b.total > 0);

  const aiText = generateAiInsight(data.number, stats, lang ?? "en");

  const seoText =
    lang === "zh"
      ? `${data.number} 历史共出现 ${stats.total_hits} 次。最近一次出现于 ${stats.last_seen_date ? formatDrawDate(stats.last_seen_date) : "—"}，${lastOp}，${lastPos}。历史一等奖 ${stats.first_prize_hits} 次，二等奖 ${stats.second_prize_hits} 次，三等奖 ${stats.third_prize_hits} 次，特别奖 ${stats.special_hits} 次，安慰奖 ${stats.consolation_hits} 次。`
      : `${data.number} has appeared ${stats.total_hits} times in historical 4D draws. Last seen on ${stats.last_seen_date ? formatDrawDate(stats.last_seen_date) : "—"} (${lastOp}, ${lastPos}). Historical breakdown: ${stats.first_prize_hits} × 1st Prize, ${stats.second_prize_hits} × 2nd Prize, ${stats.third_prize_hits} × 3rd Prize, ${stats.special_hits} × Special, ${stats.consolation_hits} × Consolation.`;

  return (
    <PageLayout title="4D " titleAccent="INTEL" subtitle="INTELLIGENCE · 40 YEARS DATA" showBack>
      <div className="space-y-10">

        {/* ── HERO ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <h1 className="font-number text-5xl md:text-6xl font-bold tracking-[0.2em]" style={{ color: "#00E5FF" }}>
              {data.number}
            </h1>
            {stats.last_seen_date && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{t("lastSeen")}:</span>
                <span style={{ fontSize: 12, color: "white" }}>{formatDrawDate(stats.last_seen_date)}</span>
                {stats.last_seen_operator && (
                  <span className="inline-flex items-center gap-1">
                    <OperatorLogo operatorKey={stats.last_seen_operator} height={14} />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{lastOp}</span>
                  </span>
                )}
                <span style={{ fontSize: 12 }} className={POSITION_COLORS[parsePosition(stats.last_seen_position ?? "").tier ?? "consolation"]}>
                  {lastPos}
                </span>
                {stats.current_gap_days != null && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                    ({stats.current_gap_days} {t("daysAgo")})
                  </span>
                )}
              </div>
            )}
            <div className="mt-4 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {SEARCH_OPERATORS.map((op) => {
                const active = operators.includes(op.id);
                return (
                  <button key={op.id} type="button" onClick={() => toggleOperator(op.id)} className="shrink-0 rounded"
                    style={{ padding: "6px 10px", border: active ? "1px solid var(--cyan)" : "1px solid var(--border-dim)", background: active ? "rgba(0,229,255,0.08)" : "transparent" }}>
                    {
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={op.logo} alt={op.id} style={{ height: 20, width: "auto", display: "block" }} />
                    }
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1.5">
              {MODE_OPTIONS.map((opt) => {
                const active = mode === opt.id;
                return (
                  <button key={opt.id} type="button" onClick={() => setMode(opt.id)} className="rounded text-xs font-medium px-3 py-1.5 transition-colors"
                    style={{ border: active ? "1px solid var(--cyan)" : "1px solid var(--border-dim)", background: active ? "rgba(0,229,255,0.08)" : "transparent", color: active ? "var(--cyan)" : "var(--text-muted)" }}>
                    {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2">
            <NumberScoreGauge score={score} />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <WatchButton number={data.number} />
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
        </div>

        {/* 搜索框 */}
        <NumberSearchBar currentNumber={data.number} />

        {/* ── 概览 ── */}
        <section>
          <SectionTitle>{t("overview")}</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <StatCell label={t("totalHitsEver")} value={stats.total_hits} accent />
            <StatCell label={t("firstPrize")} value={stats.first_prize_hits} />
            <StatCell label={t("secondPrize")} value={stats.second_prize_hits} />
            <StatCell label={t("thirdPrize")} value={stats.third_prize_hits} />
            <StatCell label={t("special")} value={stats.special_hits} />
            <StatCell label={t("consolation")} value={stats.consolation_hits} />
          </div>
        </section>

        {/* ── 周期分析 ── */}
        <section>
          <SectionTitle>{t("cycleAnalysis")}</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <CycleCell label={t("currentInterval")} value={stats.current_gap_days} unit={t("days")} highlight />
            <CycleCell label={t("avgInterval")} value={stats.avg_gap_days} unit={t("days")} />
            <CycleCell label={t("longestCold")} value={stats.max_gap_days} unit={t("days")} />
            <CycleCell label={t("shortestInterval")} value={stats.min_gap_days} unit={t("days")} />
            <CycleCell label={t("maxConsecutive")} value={stats.max_consecutive} unit={t("drawUnit")} />
          </div>
        </section>

        {/* ── 运营商分布 ── */}
        {breakdown.length > 0 && (
          <section>
            <SectionTitle>{t("operatorBreakdown")}</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {breakdown.map((b) => (
                <div key={b.operator} style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(0,229,255,0.08)", borderRadius: 12, padding: "12px 16px" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <OperatorLogo operatorKey={b.operator} height={16} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{b.label}</span>
                  </div>
                  <p className="font-number" style={{ fontSize: 28, fontWeight: 800, color: "white" }}>{b.total}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── AI 解读 ── */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <SectionTitle>{t("aiInsight")}</SectionTitle>
            <span style={{ fontSize: 9, color: "rgba(160,125,224,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: -10 }}>DATA ANALYSIS</span>
          </div>
          <div style={{ background: "linear-gradient(135deg, rgba(160,125,224,0.08), rgba(10,14,26,0.9))", border: "1px solid rgba(160,125,224,0.2)", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>{aiText}</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 10, letterSpacing: "0.05em" }}>{t("aiInsightNote")}</p>
          </div>
        </section>

        {/* ── 关联号码 ── */}
        {relatedNumbers.length > 0 && (
          <section>
            <SectionTitle>{t("relatedNumbersTitle")}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {relatedNumbers.map((r) => (
                <a key={r.number} href={`/number/${r.number}`}
                  style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "10px 16px", background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(0,229,255,0.12)", borderRadius: 10, textDecoration: "none", gap: 2, transition: "border-color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,229,255,0.4)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(0,229,255,0.12)")}>
                  <span className="font-number" style={{ fontSize: 20, fontWeight: 800, color: "#00E5FF", letterSpacing: "0.15em" }}>{r.number}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                    {r.reason === "same_last2" ? t("sameLastTwo") : t("permutation")}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {(() => {
          const mirror = data.number.split("").reverse().join("");
          if (mirror === data.number) return null;
          return (
            <section>
              <SectionTitle>{t("mirrorNumberTitle")}</SectionTitle>
              <div className="flex items-center gap-4">
                <a href={`/number/${mirror}`}
                  style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "10px 16px", background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 10, textDecoration: "none", gap: 2 }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,229,255,0.5)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)")}>
                  <span className="font-number" style={{ fontSize: 20, fontWeight: 800, color: "#00E5FF", letterSpacing: "0.15em" }}>{mirror}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>{t("mirrorReason")}</span>
                </a>
                <span className="font-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {t("mirrorHint")}
                </span>
              </div>
            </section>
          );
        })()}

        {/* ── 历史记录 ── */}
        <section>
          <SectionTitle>{t("recentAppearances")}</SectionTitle>
          <div className="subpage-card overflow-x-auto max-h-[480px] overflow-y-auto">
            {historyGroups.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("noResults")}</p>
            ) : (
              <table className="w-full text-sm" style={{ minWidth: 320 }}>
                <thead className="sticky top-0 z-10" style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)" }}>
                  <tr className="border-b border-line text-left text-muted text-xs uppercase">
                    <th className="px-3 py-2" style={{ width: 85 }}>{t("dateLabel")}</th>
                    <th className="px-3 py-2" style={{ width: 50 }}>{t("number")}</th>
                    <th className="px-3 py-2" style={{ width: 110 }}>{t("operator")}</th>
                    <th className="px-3 py-2" style={{ width: 75 }}>{t("prizePosition")}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyGroups.map((group) => (
                    <Fragment key={group.number}>
                      <tr className="border-t border-line">
                        <td colSpan={4} className="px-3 py-2">
                          <span className="font-mono text-sm tabular-nums" style={{ color: group.items.length > 0 ? "var(--cyan)" : "var(--text-dim)" }}>
                            {group.number}{" — "}{group.items.length > 0
                              ? t("historyGroupCount").replace("{count}", String(group.items.length))
                              : t("historyGroupEmpty")}
                          </span>
                        </td>
                      </tr>
                      {group.items.map((row, i) => (
                        <tr key={`${group.number}-${row.date}-${row.operator}-${i}`} className="border-b border-line/50">
                          <td className="px-2 py-2 font-mono text-[11px] tabular-nums">{formatDrawDate(row.date)}</td>
                          <td className="px-2 py-2 font-mono tabular-nums" style={{ color: "var(--cyan)" }}>{group.number}</td>
                          <td className="px-2 py-2 text-foreground">
                            <span className="inline-flex items-center gap-2">
                              <OperatorLogo operatorKey={row.operator} />
                              <span className="whitespace-nowrap">{OPERATOR_LABELS[row.operator] ?? row.operator}</span>
                            </span>
                          </td>
                          <td className={`px-2 py-2 font-medium whitespace-nowrap ${POSITION_COLORS[row.position_tier]}`}>
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

        {/* ── SEO 摘要 ── */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
          <SectionTitle>{t("seoSummary")}</SectionTitle>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.8 }}>{seoText}</p>
        </section>

      </div>
    </PageLayout>
  );
}
