"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { todayMYT } from "@/lib/draw-time";
import { formatDrawDate } from "@/lib/number-utils";
import type { ColdNumberRow, HotNumberRow } from "@/types/analytics";

const TABS = [
  { key: "hot", label: "HOT FREQUENCY" },
  { key: "cold", label: "COLD REVERSAL" },
  { key: "first", label: "FIRST PRIZE" },
] as const;
type Tab = (typeof TABS)[number]["key"];

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

export function RankingsView({ hot, cold, firstPrize }: RankingsViewProps) {
  const [tab, setTab] = useState<Tab>("hot");
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(todayMYT());
  }, []);

  const hotMaxHits = useMemo(
    () => Math.max(...hot.map((r) => r.total_hits), 1),
    [hot]
  );

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

        <div className="mt-1">
          {tab === "hot" &&
            hot.slice(0, 100).map((row, i) => {
              const gap = gapDays(row.last_seen, today);
              const barPct = Math.round((row.total_hits / hotMaxHits) * 100);
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

          {tab === "cold" &&
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

          {tab === "first" &&
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
