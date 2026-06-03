"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SubpageHeader } from "@/components/layout/SubpageHeader";
import { HeatBadge } from "@/components/number/HeatBadge";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type {
  ColdNumberRow,
  DigitAnalysis,
  DigitFrequency,
  HotNumberRow,
  PatternRow,
} from "@/types/analytics";

const HotBarChart = dynamic(
  () => import("./HotBarChart").then((m) => m.HotBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 text-muted text-sm flex items-center justify-center">
        Loading chart…
      </div>
    ),
  }
);

const TABS = ["hot", "cold", "digit", "patterns"] as const;
type Tab = (typeof TABS)[number];

function DigitGrid({
  title,
  subtitle,
  data,
  maxCount,
}: {
  title: string;
  subtitle?: string;
  data: DigitFrequency[];
  maxCount: number;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && (
        <p className="text-[10px] text-muted mb-2">{subtitle}</p>
      )}
      <div className="grid grid-cols-5 gap-1">
        {data.map((cell) => {
          const opacity =
            maxCount > 0 ? 0.15 + (cell.count / maxCount) * 0.85 : 0.15;
          return (
            <div
              key={cell.digit}
              className="rounded-md border border-line flex flex-col items-center justify-center py-2"
              style={{ backgroundColor: `rgba(245, 200, 66, ${opacity})` }}
            >
              <span className="font-number text-lg text-foreground">
                {cell.digit}
              </span>
              <span className="text-[10px] text-muted">{cell.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const { t } = useLang();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hot");
  const [quickNum, setQuickNum] = useState("");

  const tabLabels: Record<Tab, string> = {
    hot: t("hotNumbers"),
    cold: t("coldNumbers"),
    digit: t("digitAnalysis"),
    patterns: t("patterns"),
  };

  const [period, setPeriod] = useState<"30d" | "100draws">("30d");
  const [hot, setHot] = useState<HotNumberRow[]>([]);
  const [cold, setCold] = useState<ColdNumberRow[]>([]);
  const [digit, setDigit] = useState<DigitAnalysis | null>(null);
  const [patterns, setPatterns] = useState<PatternRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHot = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/analytics/hot?period=${period}`);
    const data = await res.json();
    setHot(data.rows ?? []);
    setLoading(false);
  }, [period]);

  const loadCold = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/analytics/cold?min_gap=200");
    const data = await res.json();
    setCold(data.rows ?? []);
    setLoading(false);
  }, []);

  const loadDigit = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/analytics/digit");
    const data = await res.json();
    setDigit({
      thousands: data.thousands,
      hundreds: data.hundreds,
      tens: data.tens,
      units: data.units,
    });
    setLoading(false);
  }, []);

  const loadPatterns = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/analytics/patterns");
    const data = await res.json();
    setPatterns(data.rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "hot") loadHot();
    else if (tab === "cold") loadCold();
    else if (tab === "digit") loadDigit();
    else loadPatterns();
  }, [tab, loadHot, loadCold, loadDigit, loadPatterns]);

  const maxDigit = digit
    ? Math.max(
        ...digit.thousands.map((d) => d.count),
        ...digit.hundreds.map((d) => d.count),
        ...digit.tens.map((d) => d.count),
        ...digit.units.map((d) => d.count),
        1
      )
    : 1;

  const goQuickNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const n = quickNum.replace(/\D/g, "").padStart(4, "0").slice(-4);
    if (/^\d{4}$/.test(n)) router.push(`/number/${n}`);
  };

  return (
    <div className="min-h-screen bg-surface pb-16 sm:pb-0">
      <SubpageHeader
        title={t("analyticsTitle")}
        subtitle={t("analyticsSubtitle")}
      />

      <div className="mx-auto max-w-6xl px-4 py-4">
        <form
          onSubmit={goQuickNumber}
          className="mb-6 rounded-xl border border-gold/30 bg-gold/5 p-4 flex flex-col sm:flex-row gap-3 items-center"
        >
          <span className="text-sm text-muted shrink-0">
            {t("quickNumberSearch")}
          </span>
          <input
            type="text"
            value={quickNum}
            onChange={(e) =>
              setQuickNum(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="1234"
            className="flex-1 w-full rounded-lg border border-line bg-surface-3 px-4 py-2 font-number text-2xl tracking-[0.3em] text-center text-gold"
            maxLength={4}
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-gold/20 border border-gold/40 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/30"
          >
            →
          </button>
        </form>

        <div className="flex flex-wrap gap-2 border-b border-line pb-3 mb-4">
          {TABS.map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === tabKey
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "text-muted hover:text-foreground border border-transparent"
              }`}
            >
              {tabLabels[tabKey]}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-sm text-muted mb-4">{t("loading")}</p>
        )}

        {tab === "hot" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t("hotNumbersHint")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPeriod("30d")}
                className={`rounded-lg px-3 py-1 text-xs border ${
                  period === "30d"
                    ? "border-gold/40 bg-gold/15 text-gold"
                    : "border-line text-muted"
                }`}
              >
                {t("last30days")}
              </button>
              <button
                type="button"
                onClick={() => setPeriod("100draws")}
                className={`rounded-lg px-3 py-1 text-xs border ${
                  period === "100draws"
                    ? "border-gold/40 bg-gold/15 text-gold"
                    : "border-line text-muted"
                }`}
              >
                {t("last100draws")}
              </button>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 p-4">
              <HotBarChart data={hot} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {hot.map((row) => (
                <Link
                  key={row.number}
                  href={`/number/${row.number}`}
                  className="rounded-xl border border-line bg-surface-2 p-3 hover:border-gold/40 transition-colors"
                >
                  <p className="font-number text-2xl text-gold text-center">
                    {row.number}
                  </p>
                  <p className="text-center text-xs text-muted mt-1">
                    {t("totalHits")}:{" "}
                    <span className="font-number text-foreground">
                      {row.total_hits}
                    </span>
                  </p>
                  <p className="text-center text-[10px] text-dim mt-0.5">
                    {t("lastSeen")}: {row.last_seen ?? "—"}
                  </p>
                  <div className="flex justify-center mt-2">
                    <HeatBadge level={row.heat_level} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {tab === "cold" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t("coldNumbersHint")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cold.map((row) => (
                <Link
                  key={row.number}
                  href={`/number/${row.number}`}
                  className="rounded-xl border border-line bg-surface-2 p-4 flex items-center gap-4 hover:border-sky-500/40 transition-colors"
                >
                  <p className="font-number text-3xl text-foreground shrink-0">
                    {row.number}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-number text-sky-300">
                      {row.gap_days}
                      <span className="text-sm text-muted ml-1">
                        {t("days")}
                      </span>
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {t("lastSeen")}:{" "}
                      {row.last_seen_date
                        ? formatDrawDate(row.last_seen_date)
                        : t("never")}
                    </p>
                    <p className="text-xs text-dim mt-0.5">
                      {t("totalHitsEver")}: {row.total_hits}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {tab === "digit" && digit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-line bg-surface-2 p-4">
            <DigitGrid
              title={t("thousands")}
              subtitle="Thousands"
              data={digit.thousands}
              maxCount={maxDigit}
            />
            <DigitGrid
              title={t("hundreds")}
              subtitle="Hundreds"
              data={digit.hundreds}
              maxCount={maxDigit}
            />
            <DigitGrid
              title={t("tens")}
              subtitle="Tens"
              data={digit.tens}
              maxCount={maxDigit}
            />
            <DigitGrid
              title={t("units")}
              subtitle="Units"
              data={digit.units}
              maxCount={maxDigit}
            />
          </div>
        )}

        {tab === "patterns" && (
          <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted uppercase border-b border-line">
                  <th className="px-3 py-2 text-left">{t("pattern")}</th>
                  <th className="px-3 py-2 text-left">{t("example")}</th>
                  <th className="px-3 py-2 text-center">{t("hitCount")}</th>
                </tr>
              </thead>
              <tbody>
                {patterns.map((row, i) => (
                  <tr
                    key={`${row.pattern}-${row.example}-${i}`}
                    className="border-b border-line/50"
                  >
                    <td className="px-3 py-2 text-foreground">{row.pattern}</td>
                    <td className="px-3 py-2 font-number text-gold">
                      <Link href={`/number/${row.example}`} className="hover:underline">
                        {row.example}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center font-number">
                      {row.hit_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
