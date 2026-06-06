"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { todayMYT } from "@/lib/draw-time";
import type {
  ColdNumberRow,
  DigitAnalysis,
  DigitFrequency,
  HotNumberRow,
  PatternRow,
} from "@/types/analytics";
import type { HeatLevel } from "@/types/number-intelligence";

const MONO = "font-[family-name:var(--font-mono)]";

const TABS = [
  { key: "hot", label: "热号" },
  { key: "cold", label: "冷号" },
  { key: "digit", label: "数字分析" },
  { key: "patterns", label: "模式" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const PATTERN_LABELS: Record<string, string> = {
  "Twin (AAAA)": "四同 AAAA",
  Sequential: "顺子",
  "Repeating pair (AABB)": "对子 AABB",
};

function heatText(level: HeatLevel): { label: string; color: string } {
  if (level === "hot") return { label: "热", color: "var(--accent-green)" };
  if (level === "cold") return { label: "冷", color: "var(--accent-red)" };
  return { label: "常", color: "var(--text-secondary)" };
}

function Skeleton() {
  return (
    <div className="space-y-2 pt-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-12 w-full animate-pulse rounded bg-[var(--surface-2)]"
        />
      ))}
    </div>
  );
}

function DigitRow({ label, data }: { label: string; data: DigitFrequency[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const min = Math.min(...data.map((d) => d.count));
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border-dim)] py-3">
      <span className="w-8 shrink-0 text-xs text-[var(--text-dim)]">{label}</span>
      <div className="flex flex-1 gap-1">
        {data.map((cell) => {
          const color =
            cell.count === max
              ? "var(--accent-green)"
              : cell.count === min
                ? "var(--text-dim)"
                : "var(--text-secondary)";
          const pct = Math.round((cell.count / max) * 100);
          return (
            <div
              key={cell.digit}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className={`${MONO} text-[10px]`} style={{ color }}>
                {cell.digit}
              </span>
              <div className="h-1 w-full overflow-hidden rounded-sm bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${pct}%`, backgroundColor: color }}
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
  const [loading, setLoading] = useState(true);

  const [today, setToday] = useState("");
  const [num, setNum] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    setToday(todayMYT());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, c, d, p] = await Promise.all([
          fetch("/api/analytics/hot?period=30d").then((r) => r.json()),
          fetch("/api/analytics/cold?min_gap=30").then((r) => r.json()),
          fetch("/api/analytics/digit").then((r) => r.json()),
          fetch("/api/analytics/patterns").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setHot(h.rows ?? []);
        setCold(c.rows ?? []);
        setDigit({
          thousands: d.thousands ?? [],
          hundreds: d.hundreds ?? [],
          tens: d.tens ?? [],
          units: d.units ?? [],
        });
        setPatterns(p.rows ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, PatternRow[]>();
    for (const r of patterns) {
      const arr = m.get(r.pattern) ?? [];
      arr.push(r);
      m.set(r.pattern, arr);
    }
    Array.from(m.values()).forEach(arr => arr.sort((a, b) => b.hit_count - a.hit_count));
    return Array.from(m.entries());
  }, [patterns]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const n = num.trim();
    if (/^\d{4}$/.test(n)) {
      setErr(false);
      router.push(`/number/${n}`);
    } else {
      setErr(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-1)]">
      <div
        className="mx-auto w-full max-w-[640px] px-4"
        style={{ paddingTop: 16, paddingBottom: 80 }}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`${MONO} text-lg text-[var(--text-primary)]`}>
              号码分析终端
            </h1>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              基于 40 年历史数据 · 西马 / 东马 / 新加坡
            </p>
          </div>
          <span className={`${MONO} shrink-0 text-xs text-[var(--text-dim)]`}>
            {today || "----------"}
          </span>
        </header>

        {/* Quick search */}
        <form onSubmit={submitSearch} className="mt-4 flex items-stretch gap-2">
          <input
            value={num}
            onChange={(e) => {
              setNum(e.target.value.replace(/\D/g, "").slice(0, 4));
              if (err) setErr(false);
            }}
            inputMode="numeric"
            placeholder="输入号码 0000–9999"
            className={`${MONO} flex-1 rounded-md border bg-[var(--surface-2)] px-3 py-2 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dim)] ${
              err
                ? "border-[var(--accent-red)]"
                : "border-[var(--border-dim)] focus:border-[var(--border-mid)]"
            }`}
          />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-[var(--border-dim)] px-4 text-sm font-medium text-[var(--accent-green)]"
          >
            搜索
          </button>
        </form>
        {err && (
          <p className="mt-1 text-xs text-[var(--accent-red)]">
            请输入 4 位数字（0000–9999）
          </p>
        )}

        {/* Tabs */}
        <div className="mt-5 flex gap-5 border-b border-[var(--border-dim)]">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 pb-2 text-sm transition-colors ${
                  active
                    ? "border-[var(--accent-green)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)]"
                }`}
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
          <div className="pt-1">
            {/* Hot */}
            {tab === "hot" && (
              <div>
                {hot.slice(0, 10).map((row, i) => {
                  const h = heatText(row.heat_level);
                  return (
                    <Link
                      key={row.number}
                      href={`/number/${row.number}`}
                      className="flex items-center gap-3 border-b border-[var(--border-dim)] py-3"
                    >
                      <span
                        className={`${MONO} w-8 shrink-0 text-xs text-[var(--text-dim)]`}
                      >
                        #{i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span
                            className={`${MONO} text-2xl text-[var(--accent-green)]`}
                          >
                            {row.number}
                          </span>
                          <span
                            className={`${MONO} text-sm text-[var(--text-secondary)]`}
                          >
                            +{row.total_hits}次
                          </span>
                          <span
                            className="ml-auto text-xs font-medium"
                            style={{ color: h.color }}
                          >
                            {h.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--text-dim)]">
                          最近: {row.last_seen ?? "—"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Cold */}
            {tab === "cold" && (
              <div>
                {cold.slice(0, 10).map((row) => (
                  <Link
                    key={row.number}
                    href={`/number/${row.number}`}
                    className="flex items-center gap-3 border-b border-[var(--border-dim)] py-3"
                  >
                    <span
                      className={`${MONO} shrink-0 text-xl text-[var(--accent-red)]`}
                    >
                      {row.number}
                    </span>
                    <span
                      className={`${MONO} text-sm text-[var(--text-secondary)]`}
                    >
                      冷藏{" "}
                      <span className="text-[var(--accent-amber)]">
                        {row.gap_days}
                      </span>{" "}
                      天
                    </span>
                    <span className="ml-auto text-xs text-[var(--text-dim)]">
                      最近: {row.last_seen_date ?? "—"}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Digit */}
            {tab === "digit" && digit && (
              <div>
                <DigitRow label="千位" data={digit.thousands} />
                <DigitRow label="百位" data={digit.hundreds} />
                <DigitRow label="十位" data={digit.tens} />
                <DigitRow label="个位" data={digit.units} />
              </div>
            )}

            {/* Patterns */}
            {tab === "patterns" && (
              <div className="space-y-4 pt-2">
                {grouped.map(([pattern, rows]) => (
                  <div key={pattern}>
                    <h3 className="mb-1 text-xs text-[var(--text-secondary)]">
                      {PATTERN_LABELS[pattern] ?? pattern}
                    </h3>
                    <div>
                      {rows.map((r, i) => (
                        <Link
                          key={`${r.example}-${i}`}
                          href={`/number/${r.example}`}
                          className="flex items-center justify-between border-b border-[var(--border-dim)] py-1.5"
                        >
                          <span
                            className={`${MONO} text-sm text-[var(--text-primary)]`}
                          >
                            {r.example}
                          </span>
                          <span
                            className={`${MONO} text-xs text-[var(--text-dim)]`}
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
          </div>
        )}

        {/* Bottom draw-status bar */}
        <div className="mt-6 border-t border-[var(--border-dim)] pt-3">
          <p className="text-xs text-[var(--text-dim)]">
            今日开彩：大马万字 · 多多 · 大马彩
          </p>
        </div>
      </div>
    </div>
  );
}
