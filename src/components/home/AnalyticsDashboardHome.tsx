"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMYTParts, todayMYT } from "@/lib/draw-time";

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

const WEST_DRAW_DAYS = [0, 3, 6]; // Sun, Wed, Sat
const CASHSWEEP_DRAW_DAYS = [3, 6]; // Wed, Sat

interface TodayDrawRow {
  region: string;
  operators: string;
  status: string;
}

function getTodaysDraws(day: number): TodayDrawRow[] {
  const rows: TodayDrawRow[] = [];
  if (WEST_DRAW_DAYS.includes(day)) {
    rows.push({
      region: "West Malaysia",
      operators: "MAGNUM · DAMACAI · TOTO",
      status: "SCHEDULED",
    });
  }
  if (CASHSWEEP_DRAW_DAYS.includes(day)) {
    rows.push({
      region: "East Malaysia",
      operators: "CASH SWEEP",
      status: "SCHEDULED",
    });
  }
  return rows;
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

export function AnalyticsDashboardHome() {
  const router = useRouter();

  const [today, setToday] = useState("");
  const [weekday, setWeekday] = useState(0);
  const [num, setNum] = useState("");
  const [err, setErr] = useState(false);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);

  useEffect(() => {
    const parts = getMYTParts();
    setToday(todayMYT());
    setWeekday(parts.day);
  }, []);

  const todaysDraws = useMemo(() => getTodaysDraws(weekday), [weekday]);

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
        className="mx-auto w-full max-w-[640px] lg:max-w-4xl px-4"
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

        {/* Today's draws */}
        <section className="mt-6">
          <h2
            className="font-sans text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-dim)" }}
          >
            TODAY&apos;S DRAWS
          </h2>
          <div className="mt-2 space-y-2">
            {todaysDraws.length === 0 ? (
              <p
                className="font-sans text-[11px] uppercase tracking-[0.08em]"
                style={{ color: "var(--text-dim)" }}
              >
                No draws scheduled today
              </p>
            ) : (
              todaysDraws.map((row) => (
                <div
                  key={row.region}
                  className="flex items-center justify-between gap-3 border-b py-2"
                  style={{ borderColor: "var(--border-dim)" }}
                >
                  <div>
                    <p
                      className="font-mono text-[11px] uppercase tracking-[0.06em]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {row.operators}
                    </p>
                    <p
                      className="mt-0.5 font-sans text-[9px] uppercase tracking-[0.08em]"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {row.region}
                    </p>
                  </div>
                  <span
                    className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em]"
                    style={{ color: "var(--green)" }}
                  >
                    {row.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* AI placeholder */}
        <section
          className="mt-4 flex items-center justify-between gap-3 border px-4 py-3"
          style={{
            borderColor: "rgba(130,90,220,0.2)",
            backgroundColor: "rgba(130,90,220,0.04)",
          }}
        >
          <div>
            <p
              className="font-sans text-[11px] uppercase tracking-[0.08em]"
              style={{ color: "var(--cyan)" }}
            >
              AI INTELLIGENCE
            </p>
            <p
              className="mt-1 font-sans text-[11px]"
              style={{ color: "var(--text-dim)" }}
            >
              Number analysis powered by AI — Coming Soon
            </p>
          </div>
          <button
            type="button"
            disabled
            className="shrink-0 font-mono text-lg"
            style={{ color: "var(--text-dim)" }}
          >
            →
          </button>
        </section>

        {/* Rankings entry */}
        <div
          className="mt-4 border-t pt-3"
          style={{ borderColor: "var(--border-dim)", paddingTop: 12 }}
        >
          <Link
            href="/rankings"
            className="font-mono text-[11px] uppercase tracking-[0.06em] transition-opacity hover:opacity-80"
            style={{ color: "var(--cyan)" }}
          >
            VIEW FULL RANKINGS →
          </Link>
        </div>
      </div>
    </div>
  );
}
