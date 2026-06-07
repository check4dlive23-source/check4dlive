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
import type { HeatLevel } from "@/types/number-intelligence";

const TABS = [
  { key: "momentum", label: "HOT MOMENTUM" },
  { key: "cold", label: "COLD REVERSAL" },
  { key: "digit", label: "DIGIT STRENGTH" },
  { key: "patterns", label: "PATTERN SIGNALS" },
  { key: "draws", label: "DRAW RECORDS" },
  { key: "top100", label: "TOP 100" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const TOP100_TABS = [
  { key: "hot", label: "HOT FREQUENCY" },
  { key: "cold", label: "COLD REVERSAL" },
  { key: "first", label: "FIRST PRIZE" },
] as const;
type Top100Tab = (typeof TOP100_TABS)[number]["key"];

const DIGIT_ROWS: { key: keyof DigitAnalysis; label: string }[] = [
  { key: "thousands", label: "THOUSANDS" },
  { key: "hundreds", label: "HUNDREDS" },
  { key: "tens", label: "TENS" },
  { key: "units", label: "UNITS" },
];

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

function heatLabel(level: HeatLevel): { text: string; color: string } {
  if (level === "hot") return { text: "HOT", color: "var(--green)" };
  if (level === "cold") return { text: "COLD", color: "var(--muted)" };
  return { text: "—", color: "var(--text-dim)" };
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
  const [tab, setTab] = useState<Tab>("momentum");
  const [top100Tab, setTop100Tab] = useState<Top100Tab>("hot");
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);

  const [hotMomentum, setHotMomentum] = useState<HotNumberRow[]>([]);
  const [coldReversal, setColdReversal] = useState<ColdNumberRow[]>([]);
  const [digit, setDigit] = useState<DigitAnalysis | null>(null);
  const [patterns, setPatterns] = useState<PatternRow[]>([]);
  const [drawRecords, setDrawRecords] = useState<DrawListItem[]>([]);

  useEffect(() => {
    setToday(todayMYT());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, c, d, p, draws] = await Promise.all([
          fetch("/api/analytics/hot?period=30d").then((r) => r.json()),
          fetch("/api/analytics/cold?min_gap=30").then((r) => r.json()),
          fetch("/api/analytics/digit").then((r) => r.json()),
          fetch("/api/analytics/patterns").then((r) => r.json()),
          fetch("/api/history?page=1").then((r) => r.json()),
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const momentumMaxHits = useMemo(
    () => Math.max(...hotMomentum.map((r) => r.total_hits), 1),
    [hotMomentum]
  );

  const top100HotMaxHits = useMemo(
    () => Math.max(...hot.map((r) => r.total_hits), 1),
    [hot]
  );

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

  const showSkeleton = loading && tab !== "top100";

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div
        className="mx-auto w-full max-w-[640px] lg:max-w-4xl px-4"
        style={{ paddingTop: 16, paddingBottom: 96 }}
      >
        <header
          className="border px-4 py-3"
          style={{
            borderColor: "var(--border-cyan)",
            backgroundColor: "var(--surface-2)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1
                className="font-display text-[13px] font-semibold uppercase"
                style={{ letterSpacing: "0.12em", color: "var(--cyan)" }}
              >
                4D RANKINGS
              </h1>
              <p
                className="mt-1 font-sans text-[10px] uppercase tracking-[0.08em]"
                style={{ color: "var(--text-dim)" }}
              >
                Based on 40 years · 22,885 draws
              </p>
            </div>
            <span
              className="shrink-0 font-mono text-[11px] tabular-nums"
              style={{ color: "var(--text-dim)" }}
            >
              {today || "----------"}
            </span>
          </div>
        </header>

        <div
          className="mt-5 flex gap-3 overflow-x-auto border-b scrollbar-hide"
          style={{ borderColor: "var(--border-dim)" }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="-mb-px shrink-0 border-b-2 pb-2 font-sans text-[11px] uppercase tracking-[0.08em] transition-colors"
                style={{
                  borderBottomColor: active ? "var(--cyan)" : "transparent",
                  color: active ? "var(--cyan)" : "var(--text-dim)",
                }}
              >
                {t.label}
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
                  const label = heatLabel(row.heat_level);
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
                          FREQ {row.total_hits}
                        </span>
                        {gap !== null && (
                          <span
                            className="font-mono text-[10px] tabular-nums"
                            style={{ color: "var(--text-dim)" }}
                          >
                            GAP {gap}D
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
                      LAST {row.last_seen_date ?? "—"}
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
                {drawRecords.length === 0 ? (
                  <p
                    className="py-4 font-sans text-[11px]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    No draw records found.
                  </p>
                ) : (
                  drawRecords.slice(0, 10).map((row) => {
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
                  查看完整记录 →
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
                  {TOP100_TABS.map((t) => {
                    const active = top100Tab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTop100Tab(t.key)}
                        className="-mb-px shrink-0 border-b-2 pb-2 font-sans text-[11px] uppercase tracking-[0.08em] transition-colors"
                        style={{
                          borderBottomColor: active
                            ? "var(--cyan)"
                            : "transparent",
                          color: active ? "var(--cyan)" : "var(--text-dim)",
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-1">
                  {top100Tab === "hot" &&
                    hot.slice(0, 100).map((row, i) => {
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
                              FREQ {row.total_hits}
                            </span>
                            {gap !== null && (
                              <span
                                className="font-mono text-[10px] tabular-nums"
                                style={{ color: "var(--text-dim)" }}
                              >
                                GAP {gap}D
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
                    cold.slice(0, 100).map((row, i) => (
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
                          LAST {formatDrawDate(row.last_seen_date)}
                        </span>
                      </Link>
                    ))}

                  {top100Tab === "first" &&
                    firstPrize.slice(0, 100).map((row, i) => (
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
                          LAST {formatDrawDate(row.last_seen)}
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
          DATA SOURCE: MAGNUM · DAMACAI · TOTO · CASH SWEEP · SINGAPORE POOLS
        </footer>
      </div>
    </div>
  );
}
