"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { SubpageHeader } from "@/components/layout/SubpageHeader";
import { HeatBadge } from "@/components/number/HeatBadge";
import type {
  ColdNumberRow,
  DigitAnalysis,
  DigitFrequency,
  HotNumberRow,
  PatternRow,
} from "@/types/analytics";

const HotBarChart = dynamic(
  () => import("./HotBarChart").then((m) => m.HotBarChart),
  { ssr: false, loading: () => <div className="h-64 text-muted text-sm flex items-center justify-center">Loading chart…</div> }
);

const TABS = ["hot", "cold", "digit", "patterns"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  hot: "Hot Numbers",
  cold: "Cold Numbers",
  digit: "Digit Analysis",
  patterns: "Patterns",
};

function DigitGrid({
  title,
  data,
  maxCount,
}: {
  title: string;
  data: DigitFrequency[];
  maxCount: number;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted uppercase mb-2">{title}</h3>
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
              <span className="font-number text-lg text-foreground">{cell.digit}</span>
              <span className="text-[10px] text-muted">{cell.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [tab, setTab] = useState<Tab>("hot");
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

  return (
    <div className="min-h-screen bg-surface">
      <SubpageHeader
        title="Analytics Dashboard"
        subtitle="Hot & cold numbers, digit frequency, and pattern analysis"
      />

      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex flex-wrap gap-2 border-b border-line pb-3 mb-4">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "text-muted hover:text-foreground border border-transparent"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-sm text-muted mb-4">Loading…</p>
        )}

        {tab === "hot" && (
          <div className="space-y-4">
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
                Last 30 days
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
                Last 100 draws
              </button>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 p-4">
              <HotBarChart data={hot} />
            </div>
            <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted uppercase border-b border-line">
                    <th className="px-3 py-2 text-left">Number</th>
                    <th className="px-3 py-2 text-center">Total</th>
                    <th className="px-3 py-2 text-center">1st</th>
                    <th className="px-3 py-2 text-left">Last seen</th>
                    <th className="px-3 py-2 text-left">Heat</th>
                  </tr>
                </thead>
                <tbody>
                  {hot.map((row) => (
                    <tr key={row.number} className="border-b border-line/50">
                      <td className="px-3 py-2 font-number text-gold">{row.number}</td>
                      <td className="px-3 py-2 text-center font-number">{row.total_hits}</td>
                      <td className="px-3 py-2 text-center font-number">{row.first_hits}</td>
                      <td className="px-3 py-2 text-muted">{row.last_seen ?? "—"}</td>
                      <td className="px-3 py-2">
                        <HeatBadge level={row.heat_level} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "cold" && (
          <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted uppercase border-b border-line">
                  <th className="px-3 py-2 text-left">Number</th>
                  <th className="px-3 py-2 text-left">Last seen</th>
                  <th className="px-3 py-2 text-center">Gap (days)</th>
                  <th className="px-3 py-2 text-center">Total hits</th>
                </tr>
              </thead>
              <tbody>
                {cold.map((row) => (
                  <tr key={row.number} className="border-b border-line/50">
                    <td className="px-3 py-2 font-number text-foreground">{row.number}</td>
                    <td className="px-3 py-2 text-muted">{row.last_seen_date ?? "Never"}</td>
                    <td className="px-3 py-2 text-center font-number text-sky-300">
                      {row.gap_days}
                    </td>
                    <td className="px-3 py-2 text-center font-number">{row.total_hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "digit" && digit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-line bg-surface-2 p-4">
            <DigitGrid title="Thousands" data={digit.thousands} maxCount={maxDigit} />
            <DigitGrid title="Hundreds" data={digit.hundreds} maxCount={maxDigit} />
            <DigitGrid title="Tens" data={digit.tens} maxCount={maxDigit} />
            <DigitGrid title="Units" data={digit.units} maxCount={maxDigit} />
          </div>
        )}

        {tab === "patterns" && (
          <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted uppercase border-b border-line">
                  <th className="px-3 py-2 text-left">Pattern</th>
                  <th className="px-3 py-2 text-left">Example</th>
                  <th className="px-3 py-2 text-center">Hit count</th>
                </tr>
              </thead>
              <tbody>
                {patterns.map((row, i) => (
                  <tr key={`${row.pattern}-${row.example}-${i}`} className="border-b border-line/50">
                    <td className="px-3 py-2 text-foreground">{row.pattern}</td>
                    <td className="px-3 py-2 font-number text-gold">{row.example}</td>
                    <td className="px-3 py-2 text-center font-number">{row.hit_count}</td>
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
