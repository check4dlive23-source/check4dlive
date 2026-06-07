"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  { key: "hot", label: "HOT MOMENTUM" },
  { key: "cold", label: "COLD REVERSAL" },
  { key: "digit", label: "DIGIT STRENGTH" },
  { key: "patterns", label: "PATTERN SIGNALS" },
  { key: "draws", label: "DRAW RECORDS" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const DRAW_COUNT = 52784;
const COVERAGE = "1985–2026";
const MARKETS = "MY · SG · KH";

const SEARCH_OPERATORS = [
  { id: "magnum", logo: "/logos/magnum.gif" },
  { id: "damacai", logo: "/logos/damacai.gif" },
  { id: "toto", logo: "/logos/toto.gif" },
  { id: "cashsweep", logo: "/logos/cashsweep.gif" },
  { id: "sabah", logo: "/logos/sabah88.gif" },
  { id: "sandakan", logo: "/logos/sandakan.gif" },
  { id: "singapore", logo: "/logos/sgpools.gif" },
] as const;

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

const DIGIT_ROWS: { key: keyof DigitAnalysis; label: string }[] = [
  { key: "thousands", label: "THOUSANDS" },
  { key: "hundreds", label: "HUNDREDS" },
  { key: "tens", label: "TENS" },
  { key: "units", label: "UNITS" },
];

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

function weekdayUpper(dateStr: string): string {
  if (!dateStr) return "---";
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
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

function StatCell({
  value,
  label,
  valueColor = "var(--text-primary)",
}: {
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="font-mono text-sm tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </span>
      <span
        className="font-sans text-[10px] uppercase tracking-[0.1em]"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </span>
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

export function AnalyticsDashboardHome() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("hot");
  const [hot, setHot] = useState<HotNumberRow[]>([]);
  const [cold, setCold] = useState<ColdNumberRow[]>([]);
  const [digit, setDigit] = useState<DigitAnalysis | null>(null);
  const [patterns, setPatterns] = useState<PatternRow[]>([]);
  const [drawRecords, setDrawRecords] = useState<DrawListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [today, setToday] = useState("");
  const [num, setNum] = useState("");
  const [err, setErr] = useState(false);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);

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
        setHot(h.rows ?? []);
        setCold(c.rows ?? []);
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

  const hotMaxHits = useMemo(
    () => Math.max(...hot.map((r) => r.total_hits), 1),
    [hot]
  );

  const grouped = useMemo(() => {
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

  const toggleOperator = (id: string) => {
    setSelectedOps((prev) =>
      prev.includes(id) ? prev.filter((op) => op !== id) : [...prev, id]
    );
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const n = num.trim();
    if (/^\d{4}$/.test(n)) {
      setErr(false);
      const ops = selectedOps.length > 0 ? selectedOps.join(",") : "";
      const url = ops ? `/number/${n}?operators=${ops}` : `/number/${n}`;
      router.push(url);
    } else {
      setErr(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div
        className="mx-auto w-full max-w-[640px] px-4"
        style={{ paddingTop: 16, paddingBottom: 96 }}
      >
        {/* Terminal Header */}
        <header
          className="border px-4 py-3"
          style={{
            borderColor: "var(--border-cyan)",
            backgroundColor: "var(--surface-2)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <h1
              className="font-display text-[13px] font-semibold uppercase"
              style={{ letterSpacing: "0.12em", color: "var(--cyan)" }}
            >
              CHECK4D TERMINAL
            </h1>
            <span
              className="shrink-0 font-mono text-[11px] tabular-nums"
              style={{ color: "var(--text-dim)" }}
            >
              {today || "----------"}
            </span>
          </div>

          <div
            className="my-3 h-px"
            style={{ backgroundColor: "var(--border-dim)" }}
          />

          <div className="flex items-end justify-between gap-4">
            <StatCell
              value={DRAW_COUNT.toLocaleString("en-US")}
              label="DRAWS"
            />
            <StatCell value={COVERAGE} label="COVERAGE" />
            <StatCell value={MARKETS} label="MARKETS" valueColor="var(--cyan)" />
          </div>
        </header>

        {/* Quick search */}
        <form onSubmit={submitSearch} className="mt-4 flex items-stretch">
          <input
            value={num}
            onChange={(e) => {
              setNum(e.target.value.replace(/\D/g, "").slice(0, 4));
              if (err) setErr(false);
            }}
            inputMode="numeric"
            placeholder="SEARCH NUMBER  0000 → 9999"
            className="min-w-0 flex-1 border px-3 py-2.5 font-mono text-[15px] uppercase tabular-nums outline-none placeholder:normal-case placeholder:tracking-normal"
            style={{
              backgroundColor: "var(--surface-3)",
              color: "var(--text-primary)",
              borderColor: err ? "var(--red)" : "var(--border-dim)",
            }}
            onFocus={(e) => {
              if (!err) e.currentTarget.style.borderColor = "var(--border-cyan)";
            }}
            onBlur={(e) => {
              if (!err) e.currentTarget.style.borderColor = "var(--border-dim)";
            }}
          />
          <button
            type="submit"
            className="shrink-0 border border-l-0 px-4 font-mono text-lg"
            style={{
              color: "var(--cyan)",
              backgroundColor: "var(--surface-3)",
              borderColor: err ? "var(--red)" : "var(--border-dim)",
            }}
          >
            →
          </button>
        </form>
        {err && (
          <p
            className="mt-1 font-sans text-[10px] uppercase tracking-[0.08em]"
            style={{ color: "var(--red)" }}
          >
            Enter 4-digit number (0000–9999)
          </p>
        )}

        <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {SEARCH_OPERATORS.map((op) => {
            const active = selectedOps.includes(op.id);
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

        {/* Tabs */}
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

        {/* Content */}
        {loading ? (
          <Skeleton />
        ) : (
          <div>
            {/* HOT MOMENTUM */}
            {tab === "hot" && (
              <div>
                {hot.slice(0, 20).map((row, i) => {
                  const label = heatLabel(row.heat_level);
                  const gap = gapDays(row.last_seen, today);
                  const barPct = Math.round(
                    (row.total_hits / hotMaxHits) * 100
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
                {cold.slice(0, 20).map((row, i) => (
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
                {grouped.map(([pattern, rows]) => (
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
          </div>
        )}

        {/* Bottom status bar */}
        <div
          className="mt-6 space-y-1 border-t pt-3"
          style={{ borderColor: "var(--border-dim)" }}
        >
          <p
            className="font-sans text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-dim)" }}
          >
            TODAY&nbsp;&nbsp;{weekdayUpper(today)} {today || "----------"}
          </p>
          <p
            className="font-sans text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-dim)" }}
          >
            SCHEDULED&nbsp;&nbsp;MAGNUM · DAMACAI · TOTO
          </p>
        </div>
      </div>
    </div>
  );
}
