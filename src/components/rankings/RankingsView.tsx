"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { todayMYT } from "@/lib/draw-time";
import { formatDrawDate } from "@/lib/number-utils";
import type {
  ColdNumberRow,
  DigitAnalysis,
  DigitFrequency,
  DrawListItem,
  HotNumberRow,
  PatternRow,
} from "@/types/analytics";
import { PageLayout } from "@/components/layout/PageLayout";
import { useLang } from "@/lib/language-context";

type Tab = "momentum" | "cold" | "digit" | "patterns" | "draws" | "top100";
type Top100Tab = "hot" | "cold" | "first";

const SEARCH_OPERATORS = [
  { id: "magnum", logo: "/logos/magnum.gif" },
  { id: "damacai", logo: "/logos/damacai.gif" },
  { id: "toto", logo: "/logos/toto.gif" },
  { id: "cashsweep", logo: "/logos/cashsweep.gif" },
  { id: "sabah", logo: "/logos/sabah88.gif" },
  { id: "sandakan", logo: "/logos/sandakan.gif" },
  { id: "singapore", logo: "/logos/sgpools.gif" },
] as const;

/** draw history v1 operator column */
const OPERATOR_TO_DRAW: Record<string, string> = {
  magnum: "magnum",
  damacai: "damacai",
  toto: "toto",
  cashsweep: "sarawak",
  sabah: "sabah",
  sandakan: "sandakan",
  singapore: "sgpools",
};

function operatorsQuery(operators: string[]): string {
  return operators.length
    ? `&operators=${encodeURIComponent(operators.join(","))}`
    : "";
}

function operatorsSearch(operators: string[], sinceDate?: string): string {
  const params = new URLSearchParams();
  if (operators.length) params.set("operators", operators.join(","));
  if (sinceDate) params.set("since", sinceDate);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function sinceQuery(sinceDate?: string): string {
  return sinceDate ? `&since=${encodeURIComponent(sinceDate)}` : "";
}

type Period = "all" | "30d" | "1y" | "5y";

function sinceDateFromPeriod(period: Period, today: string): string | undefined {
  if (period === "all" || !today) return undefined;
  const d = new Date(`${today}T12:00:00`);
  const days = period === "30d" ? 30 : period === "1y" ? 365 : 1825;
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

const DRAW_OPERATOR_LOGOS: Record<string, string> = {
  magnum: "/logos/magnum.gif",
  damacai: "/logos/damacai.gif",
  toto: "/logos/toto.gif",
  sarawak: "/logos/cashsweep.gif",
  sgpools: "/logos/sgpools.gif",
  sabah: "/logos/sabah88.gif",
  sandakan: "/logos/sandakan.gif",
};

const DRAW_OPERATOR_LABELS: Record<string, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Toto",
  sarawak: "Cash Sweep",
  sgpools: "SG Pools",
  sabah: "Sabah",
  sandakan: "Sandakan",
  gd: "Grand Dragon",
  perdana: "Perdana",
  hari: "Lucky HH",
};

interface RankingsViewProps {
  hot: HotNumberRow[];
  cold: ColdNumberRow[];
  firstPrize: HotNumberRow[];
}

function gapDays(lastSeen: string | null, today: string): number | null {
  if (!lastSeen || !today) return null;
  const diff = new Date(today).getTime() - new Date(lastSeen).getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}

function Skeleton() {
  return (
    <div className="space-y-2 pt-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 w-full animate-pulse bg-[var(--surface-3)]"
        />
      ))}
    </div>
  );
}

function DigitRow({ label, data }: { label: string; data: DigitFrequency[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const min = Math.min(...data.map((d) => d.count));

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border-dim)] py-2.5">
      <span
        className="w-20 shrink-0 font-sans text-[10px] uppercase tracking-[0.1em]"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </span>
      <div className="flex flex-1 gap-1">
        {data.map((cell) => {
          const isMax = cell.count === max;
          const isMin = cell.count === min;
          const barColor = isMax
            ? "var(--green)"
            : isMin
              ? "var(--text-dim)"
              : "var(--cyan)";
          const pct = Math.round((cell.count / max) * 100);
          return (
            <div
              key={cell.digit}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span
                className="font-mono text-[10px] tabular-nums"
                style={{
                  color: isMax
                    ? "var(--green)"
                    : isMin
                      ? "var(--text-dim)"
                      : "var(--text-secondary)",
                }}
              >
                {cell.digit}
              </span>
              <div className="h-1 w-full overflow-hidden bg-[var(--surface-3)]">
                <div
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    opacity: isMin ? 0.35 : isMax ? 1 : 0.65,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RankingsView({ hot, cold, firstPrize }: RankingsViewProps) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("momentum");
  const [top100Tab, setTop100Tab] = useState<Top100Tab>("hot");
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("all");

  const toggleOperator = (id: string) => {
    setSelectedOperators((prev) =>
      prev.includes(id) ? prev.filter((op) => op !== id) : [...prev, id]
    );
  };

  const [hotMomentum, setHotMomentum] = useState<HotNumberRow[]>([]);
  const [coldReversal, setColdReversal] = useState<ColdNumberRow[]>([]);
  const [digit, setDigit] = useState<DigitAnalysis | null>(null);
  const [patterns, setPatterns] = useState<PatternRow[]>([]);
  const [drawRecords, setDrawRecords] = useState<DrawListItem[]>([]);
  const [top100Hot, setTop100Hot] = useState<HotNumberRow[]>(hot);
  const [top100Cold, setTop100Cold] = useState<ColdNumberRow[]>(cold);
  const [top100First, setTop100First] = useState<HotNumberRow[]>(firstPrize);

  useEffect(() => {
    setToday(todayMYT());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const oq = operatorsQuery(selectedOperators);
      const sq = sinceQuery(sinceDateFromPeriod(selectedPeriod, today));
      const historyOp =
        selectedOperators.length === 1
          ? `&operator=${encodeURIComponent(OPERATOR_TO_DRAW[selectedOperators[0]] ?? selectedOperators[0])}`
          : "";
      const sinceDate = sinceDateFromPeriod(selectedPeriod, today);
      try {
        const noFilter =
          selectedOperators.length === 0 && selectedPeriod === "all";

        const [h, c, d, p, draws, hotTop, coldTop] = await Promise.all([
          fetch(`/api/analytics/hot?period=30d${oq}${sq}`).then((r) => r.json()),
          fetch(`/api/analytics/cold?min_gap=30${oq}${sq}`).then((r) => r.json()),
          fetch(
            `/api/analytics/digit${operatorsSearch(selectedOperators, sinceDate)}`
          ).then((r) => r.json()),
          fetch(
            `/api/analytics/patterns${operatorsSearch(selectedOperators, sinceDate)}`
          ).then((r) => r.json()),
          fetch(`/api/history?page=1${historyOp}${sq}`).then((r) => r.json()),
          noFilter
            ? Promise.resolve({ rows: hot })
            : fetch(`/api/analytics/hot?period=100draws${oq}${sq}`).then((r) =>
                r.json()
              ),
          noFilter
            ? Promise.resolve({ rows: cold })
            : fetch(`/api/analytics/cold?min_gap=0${oq}${sq}`).then((r) =>
                r.json()
              ),
        ]);
        if (cancelled) return;
        setHotMomentum(h.rows ?? []);
        setColdReversal(c.rows ?? []);
        setDigit({
          thousands: d.thousands ?? d.data?.thousands ?? [],
          hundreds: d.hundreds ?? d.data?.hundreds ?? [],
          tens: d.tens ?? d.data?.tens ?? [],
          units: d.units ?? d.data?.units ?? [],
        });
        setPatterns(p.rows ?? []);
        setDrawRecords(draws.items ?? []);

        if (selectedOperators.length === 0 && selectedPeriod === "all") {
          setTop100Hot(hot);
          setTop100Cold(cold);
          setTop100First(firstPrize);
        } else {
          const hotRows = (hotTop.rows ?? []) as HotNumberRow[];
          setTop100Hot(hotRows);
          setTop100Cold((coldTop.rows ?? []) as ColdNumberRow[]);
          setTop100First(
            [...hotRows].sort((a, b) => b.first_hits - a.first_hits)
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOperators, selectedPeriod, today, hot, cold, firstPrize]);

  const momentumMaxHits = useMemo(
    () => Math.max(...hotMomentum.map((r) => r.total_hits), 1),
    [hotMomentum]
  );

  const top100HotMaxHits = useMemo(
    () => Math.max(...top100Hot.map((r) => r.total_hits), 1),
    [top100Hot]
  );

  const filteredDrawRecords = useMemo(() => {
    if (selectedOperators.length === 0) return drawRecords;
    const drawOps = new Set(
      selectedOperators.map((op) => OPERATOR_TO_DRAW[op] ?? op)
    );
    return drawRecords.filter((r) => drawOps.has(r.operator));
  }, [drawRecords, selectedOperators]);

  const groupedPatterns = useMemo(() => {
    const m = new Map<string, PatternRow[]>();
    for (const r of patterns) {
      const arr = m.get(r.pattern) ?? [];
      arr.push(r);
      m.set(r.pattern, arr);
    }
    Array.from(m.values()).forEach((arr) =>
      arr.sort((a, b) => b.hit_count - a.hit_count)
    );
    return Array.from(m.entries());
  }, [patterns]);

  const showSkeleton = loading;

  const TABS = [
    { key: "momentum" as const, label: t("hotMomentum") },
    { key: "cold" as const, label: t("coldReversal") },
    { key: "digit" as const, label: t("digitStrength") },
    { key: "patterns" as const, label: t("patternSignals") },
    { key: "draws" as const, label: t("drawRecords") },
    { key: "top100" as const, label: t("top100") },
  ];

  const TOP100_TABS = [
    { key: "hot" as const, label: t("hotFrequency") },
    { key: "cold" as const, label: t("coldReversal") },
    { key: "first" as const, label: t("firstPrizeTab") },
  ];

  const PERIOD_OPTIONS: { id: Period; label: string }[] = [
    { id: "all", label: t("periodAll") },
    { id: "30d", label: t("period30d") },
    { id: "1y", label: t("period1y") },
    { id: "5y", label: t("period5y") },
  ];

  const DIGIT_ROWS: { key: keyof DigitAnalysis; label: string }[] = [
    { key: "thousands", label: t("thousands") },
    { key: "hundreds", label: t("hundreds") },
    { key: "tens", label: t("tens") },
    { key: "units", label: t("units") },
  ];

  const heatLabel = (row: HotNumberRow) => {
    if (row.heat_level === "hot") return { text: "HOT", color: "#00FF88" };
    if (row.heat_level === "cold") return { text: "COLD", color: "#FF4D4D" };
    return { text: "—", color: "rgba(255,255,255,0.3)" };
  };

  return (
    <PageLayout
      title="RANK"
      titleAccent="INGS"
      subtitle={t("top100Data")}
    >
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => setSelectedOperators([])}
            className="shrink-0 rounded font-sans text-[10px] uppercase tracking-[0.06em]"
            style={{
              padding: "6px 10px",
              border:
                selectedOperators.length === 0
                  ? "1px solid var(--cyan)"
                  : "1px solid var(--border-dim)",
              background:
                selectedOperators.length === 0
                  ? "rgba(0,229,255,0.08)"
                  : "transparent",
              color:
                selectedOperators.length === 0
                  ? "var(--cyan)"
                  : "var(--text-dim)",
            }}
          >
            {t("periodAll")}
          </button>
          {SEARCH_OPERATORS.map((op) => {
            const active = selectedOperators.includes(op.id);
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

        <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {PERIOD_OPTIONS.map((opt) => {
            const active = selectedPeriod === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedPeriod(opt.id)}
                className="shrink-0 rounded font-mono text-[10px] uppercase tracking-[0.06em]"
                style={{
                  padding: "4px 10px",
                  border: active
                    ? "1px solid var(--cyan)"
                    : "1px solid var(--border-dim)",
                  background: active
                    ? "rgba(0,229,255,0.08)"
                    : "transparent",
                  color: active ? "var(--cyan)" : "var(--text-dim)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div
          className="mt-5 flex gap-3 overflow-x-auto border-b scrollbar-hide"
          style={{ borderColor: "var(--border-dim)" }}
        >
          {TABS.map((tabItem) => {
            const active = tab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                type="button"
                onClick={() => setTab(tabItem.key)}
                className="-mb-px shrink-0 border-b-2 pb-2 font-sans text-[11px] uppercase tracking-[0.08em] transition-colors"
                style={{
                  borderBottomColor: active ? "var(--cyan)" : "transparent",
                  color: active ? "var(--cyan)" : "var(--text-dim)",
                }}
              >
                {tabItem.label}
              </button>
            );
          })}
        </div>

        {showSkeleton ? (
          <Skeleton />
        ) : (
          <div className="mt-1">
            {/* HOT MOMENTUM */}
            {tab === "momentum" && (
              <div>
                {hotMomentum.slice(0, 20).map((row, i) => {
                  const label = heatLabel(row);
                  const gap = gapDays(row.last_seen, today);
                  const barPct = Math.round(
                    (row.total_hits / momentumMaxHits) * 100
                  );
                  return (
                    <Link
                      key={row.number}
                      href={`/number/${row.number}`}
                      className="block border-b py-1.5"
                      style={{ borderColor: "var(--border-dim)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 shrink-0 font-mono text-[10px] tabular-nums"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="shrink-0 font-mono text-[24px] font-medium tabular-nums"
                          style={{
                            color: "var(--cyan)",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {row.number}
                        </span>
                        <span
                          className="ml-auto font-mono text-[11px] tabular-nums"
                          style={{ color: "var(--green)" }}
                        >
                          {t("freq")} {row.total_hits}
                        </span>
                        {gap !== null && (
                          <span
                            className="font-mono text-[10px] tabular-nums"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {t("gap")} {gap}D
                          </span>
                        )}
                        <span
                          className="w-14 shrink-0 text-right font-mono text-[10px] uppercase tracking-[0.08em]"
                          style={{ color: label.color }}
                        >
                          {label.text}
                        </span>
                      </div>
                      <div className="mt-0.5">
                        <div
                          className="h-0.5 w-full overflow-hidden"
                          style={{ backgroundColor: "var(--surface-3)" }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor: "var(--cyan)",
                              opacity: 0.6,
                            }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* COLD REVERSAL */}
            {tab === "cold" && (
              <div>
                {coldReversal.slice(0, 20).map((row, i) => (
                  <Link
                    key={row.number}
                    href={`/number/${row.number}`}
                    className="flex items-center gap-2 border-b py-1.5"
                    style={{ borderColor: "var(--border-dim)" }}
                  >
                    <span
                      className="w-5 shrink-0 font-mono text-[10px] tabular-nums"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="shrink-0 font-mono text-[22px] font-medium tabular-nums"
                      style={{
                        color: "var(--muted)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {row.number}
                    </span>
                    <span
                      className="font-mono text-sm tabular-nums"
                      style={{ color: "var(--amber)" }}
                    >
                      {row.gap_days}D
                    </span>
                    <span
                      className="ml-auto font-sans text-[11px] uppercase tracking-[0.08em]"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("last")} {row.last_seen_date ?? "—"}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* DIGIT STRENGTH */}
            {tab === "digit" && digit && (
              <div>
                {DIGIT_ROWS.map(({ key, label }) => (
                  <DigitRow key={key} label={label} data={digit[key]} />
                ))}
              </div>
            )}

            {/* PATTERN SIGNALS */}
            {tab === "patterns" && (
              <div className="space-y-4 pt-2">
                {groupedPatterns.map(([pattern, rows]) => (
                  <div key={pattern}>
                    <h3
                      className="mb-1 font-sans text-[10px] uppercase tracking-[0.1em]"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {pattern}
                    </h3>
                    <div>
                      {rows.map((r, idx) => (
                        <Link
                          key={`${r.example}-${idx}`}
                          href={`/number/${r.example}`}
                          className="flex items-center justify-between border-b py-1.5 transition-colors hover:bg-[var(--surface-3)]"
                          style={{ borderColor: "var(--border-dim)" }}
                        >
                          <span
                            className="font-mono text-sm tabular-nums"
                            style={{
                              color: "var(--text-primary)",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {r.example}
                          </span>
                          <span
                            className="font-mono text-xs tabular-nums"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {r.hit_count}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DRAW RECORDS */}
            {tab === "draws" && (
              <div>
                {filteredDrawRecords.length === 0 ? (
                  <p
                    className="py-4 font-sans text-[11px]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {t("noDrawRecords")}
                  </p>
                ) : (
                  filteredDrawRecords.slice(0, 10).map((row) => {
                    const logo = DRAW_OPERATOR_LOGOS[row.operator];
                    const label =
                      DRAW_OPERATOR_LABELS[row.operator] ?? row.operator;
                    return (
                      <div
                        key={row.id}
                        className="flex items-center gap-2 border-b py-1.5"
                        style={{ borderColor: "var(--border-dim)" }}
                      >
                        <span
                          className="w-[72px] shrink-0 font-sans text-[10px] tabular-nums"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {formatDrawDate(row.date)}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                          {logo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={logo}
                              alt={row.operator}
                              className="shrink-0"
                              style={{
                                height: 16,
                                width: "auto",
                                display: "block",
                              }}
                            />
                          )}
                          <span
                            className="truncate font-sans text-[10px] uppercase tracking-[0.06em]"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {label}
                          </span>
                        </span>
                        <span
                          className="shrink-0 font-mono text-[15px] font-medium tabular-nums"
                          style={{
                            color: "var(--cyan)",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {row.first_prize ?? "—"}
                        </span>
                      </div>
                    );
                  })
                )}
                <Link
                  href="/draws"
                  className="mt-3 inline-block font-sans text-[11px] transition-colors hover:underline"
                  style={{ color: "var(--text-dim)" }}
                >
                  {t("viewFullRecords")}
                </Link>
              </div>
            )}

            {/* TOP 100 */}
            {tab === "top100" && (
              <div>
                <div
                  className="flex gap-3 overflow-x-auto border-b scrollbar-hide"
                  style={{ borderColor: "var(--border-dim)" }}
                >
                  {TOP100_TABS.map((tabItem) => {
                    const active = top100Tab === tabItem.key;
                    return (
                      <button
                        key={tabItem.key}
                        type="button"
                        onClick={() => setTop100Tab(tabItem.key)}
                        className="-mb-px shrink-0 border-b-2 pb-2 font-sans text-[11px] uppercase tracking-[0.08em] transition-colors"
                        style={{
                          borderBottomColor: active
                            ? "var(--cyan)"
                            : "transparent",
                          color: active ? "var(--cyan)" : "var(--text-dim)",
                        }}
                      >
                        {tabItem.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-1">
                  {top100Tab === "hot" &&
                    top100Hot.slice(0, 100).map((row, i) => {
                      const gap = gapDays(row.last_seen, today);
                      const barPct = Math.round(
                        (row.total_hits / top100HotMaxHits) * 100
                      );
                      return (
                        <Link
                          key={row.number}
                          href={`/number/${row.number}`}
                          className="block border-b py-1.5"
                          style={{ borderColor: "var(--border-dim)" }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-7 shrink-0 font-mono text-[10px] tabular-nums"
                              style={{ color: "var(--text-dim)" }}
                            >
                              {String(i + 1).padStart(3, "0")}
                            </span>
                            <span
                              className="shrink-0 font-mono text-[22px] font-medium tabular-nums"
                              style={{
                                color: "var(--cyan)",
                                letterSpacing: "0.08em",
                              }}
                            >
                              {row.number}
                            </span>
                            <span
                              className="ml-auto font-mono text-[11px] tabular-nums"
                              style={{ color: "var(--green)" }}
                            >
                              {t("freq")} {row.total_hits}
                            </span>
                            {gap !== null && (
                              <span
                                className="font-mono text-[10px] tabular-nums"
                                style={{ color: "var(--text-dim)" }}
                              >
                                {t("gap")} {gap}D
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 pl-9">
                            <div
                              className="h-px w-full overflow-hidden"
                              style={{ backgroundColor: "var(--surface-3)" }}
                            >
                              <div
                                className="h-full"
                                style={{
                                  width: `${barPct}%`,
                                  backgroundColor: "var(--cyan)",
                                  opacity: 0.4,
                                }}
                              />
                            </div>
                          </div>
                        </Link>
                      );
                    })}

                  {top100Tab === "cold" &&
                    top100Cold.slice(0, 100).map((row, i) => (
                      <Link
                        key={row.number}
                        href={`/number/${row.number}`}
                        className="flex items-center gap-2 border-b py-1.5"
                        style={{ borderColor: "var(--border-dim)" }}
                      >
                        <span
                          className="w-7 shrink-0 font-mono text-[10px] tabular-nums"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {String(i + 1).padStart(3, "0")}
                        </span>
                        <span
                          className="shrink-0 font-mono text-[22px] font-medium tabular-nums"
                          style={{
                            color: "var(--muted)",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {row.number}
                        </span>
                        <span
                          className="font-mono text-sm tabular-nums"
                          style={{ color: "var(--amber)" }}
                        >
                          {row.gap_days}D
                        </span>
                        <span
                          className="ml-auto font-sans text-[11px] uppercase tracking-[0.08em]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {t("last")} {formatDrawDate(row.last_seen_date)}
                        </span>
                      </Link>
                    ))}

                  {top100Tab === "first" &&
                    top100First.slice(0, 100).map((row, i) => (
                      <Link
                        key={row.number}
                        href={`/number/${row.number}`}
                        className="flex items-center gap-2 border-b py-1.5"
                        style={{ borderColor: "var(--border-dim)" }}
                      >
                        <span
                          className="w-7 shrink-0 font-mono text-[10px] tabular-nums"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {String(i + 1).padStart(3, "0")}
                        </span>
                        <span
                          className="shrink-0 font-mono text-[22px] font-medium tabular-nums"
                          style={{
                            color: "var(--cyan)",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {row.number}
                        </span>
                        <span
                          className="font-mono text-[11px] tabular-nums"
                          style={{ color: "#FFD700" }}
                        >
                          🥇 {row.first_hits}
                        </span>
                        <span
                          className="ml-auto font-sans text-[11px] uppercase tracking-[0.08em]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {t("last")} {formatDrawDate(row.last_seen)}
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <footer
          className="mt-6 border-t pt-3 font-sans text-[10px] uppercase tracking-[0.08em]"
          style={{
            borderColor: "var(--border-dim)",
            color: "var(--text-dim)",
          }}
        >
          DATA SOURCE: MAGNUM · DAMACAI · TOTO · CASH SWEEP · SABAH 88 · SANDAKAN 4D ·SINGAPORE POOLS
        </footer>
    </PageLayout>
  );
}
