"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";
import type { ColdNumberRow, HotNumberRow } from "@/types/analytics";
import type { Region } from "@/types";

const LIVE_REGIONS: Region[] = ["west", "east", "cambodia", "singapore"];

const PARTICLES = [
  { top: "18%", left: "12%", size: 4, delay: "0s" },
  { top: "32%", left: "78%", size: 3, delay: "0.4s" },
  { top: "55%", left: "25%", size: 5, delay: "0.8s" },
  { top: "42%", left: "62%", size: 3, delay: "1.2s" },
  { top: "68%", left: "88%", size: 4, delay: "0.6s" },
];

function daysAgoLabel(dateStr: string | null): string {
  if (!dateStr) return "—";
  const today = todayMYT();
  const diff = Math.max(
    0,
    Math.round(
      (new Date(today).getTime() - new Date(dateStr).getTime()) / 86_400_000
    )
  );
  return `${diff}天前`;
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function useAnyRegionLive(): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const check = () =>
      setLive(LIVE_REGIONS.some((r) => isRegionLiveDraw(r)));
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);
  return live;
}

function SearchIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00E5FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

function HotCardSkeleton() {
  return (
    <div
      className="relative shrink-0 animate-pulse overflow-hidden rounded-2xl"
      style={{ width: 148, height: 180, backgroundColor: "rgba(255,255,255,0.06)" }}
    />
  );
}

function HotCard({ row, rank }: { row: HotNumberRow; rank: number }) {
  const rankLabel = String(rank).padStart(2, "0");
  return (
    <Link
      href={`/number/${row.number}`}
      className="relative block shrink-0 overflow-hidden rounded-2xl"
      style={{ width: 148, height: 180 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #0a0e1a 100%)",
        }}
      />
      <div
        className="absolute"
        style={{
          top: -30,
          left: -30,
          width: 140,
          height: 140,
          background:
            "radial-gradient(circle, rgba(0,229,255,0.3), transparent 65%)",
        }}
      />
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: 1,
          background: "linear-gradient(90deg, #00E5FF, transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ border: "1px solid rgba(0,229,255,0.12)" }}
      />
      <span
        className="absolute font-mono"
        style={{
          top: 14,
          left: 16,
          fontSize: 10,
          color: "rgba(255,255,255,0.2)",
        }}
      >
        NO.{rankLabel}
      </span>
      <span
        className="absolute font-mono uppercase"
        style={{
          top: 12,
          right: 12,
          fontSize: 9,
          color: "#00FF88",
          background: "rgba(0,255,136,0.15)",
          borderRadius: 100,
          padding: "3px 8px",
        }}
      >
        HOT
      </span>
      <span
        className="absolute font-mono tabular-nums"
        style={{
          bottom: 50,
          left: 16,
          fontSize: 44,
          fontWeight: 900,
          color: "white",
          textShadow: "0 0 30px rgba(0,229,255,0.6)",
          lineHeight: 1,
        }}
      >
        {row.number}
      </span>
      <span
        className="absolute font-mono font-semibold tabular-nums"
        style={{ bottom: 30, left: 16, fontSize: 11, color: "#00FF88" }}
      >
        FREQ {row.total_hits}
      </span>
      <span
        className="absolute font-mono"
        style={{
          bottom: 14,
          left: 16,
          fontSize: 10,
          color: "rgba(255,255,255,0.2)",
        }}
      >
        {daysAgoLabel(row.last_seen)}
      </span>
    </Link>
  );
}

function ColdCard({ row, rank }: { row: ColdNumberRow; rank: number }) {
  const rankLabel = String(rank).padStart(2, "0");
  return (
    <Link
      href={`/number/${row.number}`}
      className="relative block shrink-0 overflow-hidden rounded-2xl"
      style={{ width: 148, height: 180 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #1a1000 0%, #0a0e1a 100%)",
        }}
      />
      <div
        className="absolute"
        style={{
          top: -30,
          left: -30,
          width: 140,
          height: 140,
          background:
            "radial-gradient(circle, rgba(255,176,32,0.25), transparent 65%)",
        }}
      />
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: 1,
          background: "linear-gradient(90deg, #FFB020, transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ border: "1px solid rgba(255,176,32,0.12)" }}
      />
      <span
        className="absolute font-mono"
        style={{
          top: 14,
          left: 16,
          fontSize: 10,
          color: "rgba(255,255,255,0.2)",
        }}
      >
        NO.{rankLabel}
      </span>
      <span
        className="absolute font-mono tabular-nums"
        style={{
          bottom: 62,
          left: 16,
          fontSize: 44,
          fontWeight: 900,
          color: "rgba(255,255,255,0.45)",
          lineHeight: 1,
        }}
      >
        {row.number}
      </span>
      <span
        className="absolute font-mono font-extrabold tabular-nums"
        style={{ bottom: 32, left: 16, fontSize: 24, color: "#FFB020" }}
      >
        {row.gap_days}
      </span>
      <span
        className="absolute font-mono uppercase"
        style={{
          bottom: 14,
          left: 16,
          fontSize: 10,
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.1em",
        }}
      >
        未出现
      </span>
    </Link>
  );
}

export function AnalyticsDashboardHome() {
  const anyLive = useAnyRegionLive();
  const [hot, setHot] = useState<HotNumberRow[]>([]);
  const [cold, setCold] = useState<ColdNumberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hRes, cRes] = await Promise.all([
          fetch("/api/analytics/hot?period=30d"),
          fetch("/api/analytics/cold?min_gap=30"),
        ]);
        const hData = await hRes.json();
        const cData = await cRes.json();
        if (!cancelled) {
          setHot((hData.rows ?? []).slice(0, 8));
          setCold((cData.rows ?? []).slice(0, 8));
        }
      } catch {
        if (!cancelled) {
          setHot([]);
          setCold([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hero = hot[0];

  return (
    <div
      className="relative mx-auto min-h-screen w-full max-w-[390px] lg:max-w-[390px]"
      style={{ backgroundColor: "#070710", paddingBottom: 100 }}
    >
      {/* 1. Top nav */}
      <header
        className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between"
        style={{ padding: "52px 22px 0" }}
      >
        <div style={{ lineHeight: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "18px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#fff",
            }}
          >
            CHECK<span style={{ color: "#00E5FF" }}>4D</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "8px",
              fontWeight: 400,
              letterSpacing: "0.35em",
              color: "rgba(0,229,255,0.6)",
              marginTop: "2px",
            }}
          >
            TERMINAL
          </div>
        </div>
        <Link href="/search" aria-label="Search" className="flex items-center">
          <SearchIcon />
        </Link>
      </header>

      {/* 2. Hero */}
      <section className="relative" style={{ height: 480 }}>
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 50% 20%, rgba(0,229,255,0.22) 0%, transparent 55%),
                radial-gradient(ellipse 60% 50% at 80% 80%, rgba(0,80,255,0.15) 0%, transparent 60%),
                linear-gradient(180deg, #0d1a3e 0%, #070710 100%)
              `,
            }}
          />
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute animate-pulse rounded-full"
              style={{
                top: `calc(${p.top} + 40px)`,
                left: p.left,
                width: p.size,
                height: p.size,
                backgroundColor: "rgba(0,229,255,0.6)",
                animationDelay: p.delay,
              }}
            />
          ))}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 300,
              background: "linear-gradient(transparent, #070710)",
            }}
          />
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 z-10"
          style={{ padding: "0 22px 28px" }}
        >
          {anyLive && (
            <span
              className="mb-4 inline-flex items-center font-mono"
              style={{
                gap: 5,
                background: "rgba(0,255,136,0.12)",
                border: "1px solid rgba(0,255,136,0.25)",
                borderRadius: 100,
                padding: "5px 11px",
                fontSize: 10,
                color: "#00FF88",
              }}
            >
              <span
                className="animate-pulse rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: "#00FF88",
                  boxShadow: "0 0 8px #00FF88",
                }}
              />
              LIVE · 开彩中
            </span>
          )}

          {hero && !loading ? (
            <Link href={`/number/${hero.number}`} className="block">
              <p
                className="font-mono tabular-nums"
                style={{
                  fontSize: 96,
                  fontWeight: 900,
                  color: "white",
                  textShadow:
                    "0 0 80px rgba(0,229,255,0.5), 0 0 160px rgba(0,229,255,0.25)",
                  letterSpacing: "0.02em",
                  lineHeight: 0.9,
                }}
              >
                {hero.number}
              </p>
            </Link>
          ) : (
            <p
              className="font-mono tabular-nums"
              style={{
                fontSize: 96,
                fontWeight: 900,
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.02em",
                lineHeight: 0.9,
              }}
            >
              {loading ? "----" : "0000"}
            </p>
          )}

          <p
            className="mt-3"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}
          >
            今日最热号码 · Magnum 4D
          </p>

          <p
            className="mt-2 flex flex-wrap items-center gap-2"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}
          >
            <span>
              出现 {hero?.total_hits ?? "—"} 次
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{formatDateShort(hero?.last_seen ?? null)}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>40年数据</span>
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href={hero ? `/number/${hero.number}` : "/rankings"}
              className="flex-1 text-center font-sans"
              style={{
                background: "#00E5FF",
                color: "#050816",
                fontWeight: 800,
                borderRadius: 10,
                padding: 14,
                boxShadow: "0 4px 28px rgba(0,229,255,0.4)",
                fontSize: 14,
              }}
            >
              查看详情
            </Link>
            <Link
              href="/live"
              className="flex-1 text-center font-sans backdrop-blur"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                borderRadius: 10,
                padding: 14,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              实时开彩
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Hot numbers */}
      <section className="mt-8">
        <div
          className="mb-4 flex items-center justify-between"
          style={{ padding: "0 22px" }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "white" }}>
            🔥 本周热号
          </h2>
          <Link href="/rankings" style={{ fontSize: 12, color: "#00E5FF" }}>
            全部 →
          </Link>
        </div>
        <div
          className="flex gap-3 overflow-x-auto scrollbar-hide"
          style={{ padding: "0 22px" }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <HotCardSkeleton key={i} />
              ))
            : hot.map((row, i) => (
                <HotCard key={row.number} row={row} rank={i + 1} />
              ))}
        </div>
      </section>

      {/* 4. Cold numbers */}
      <section className="mt-8">
        <div
          className="mb-4 flex items-center justify-between"
          style={{ padding: "0 22px" }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "white" }}>
            🧊 冷号预警
          </h2>
          <Link href="/rankings" style={{ fontSize: 12, color: "#00E5FF" }}>
            全部 →
          </Link>
        </div>
        <div
          className="flex gap-3 overflow-x-auto scrollbar-hide"
          style={{ padding: "0 22px" }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <HotCardSkeleton key={i} />
              ))
            : cold.map((row, i) => (
                <ColdCard key={row.number} row={row} rank={i + 1} />
              ))}
        </div>
      </section>

      {/* 5. AI placeholder */}
      <section
        className="relative mt-6 overflow-hidden"
        style={{ margin: "16px 22px", borderRadius: 20 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #0f0a2e, #1a0a3e, #070710)",
          }}
        />
        <div
          className="absolute"
          style={{
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            background:
              "radial-gradient(circle, rgba(160,125,224,0.35), transparent 65%)",
          }}
        />
        <div className="relative" style={{ padding: "24px 22px" }}>
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              color: "#a07de0",
              letterSpacing: "0.2em",
            }}
          >
            ✦ AI INTELLIGENCE
          </p>
          <h3
            className="mt-3 whitespace-pre-line"
            style={{ fontSize: 22, fontWeight: 800, color: "white" }}
          >
            号码 AI{"\n"}深度分析
          </h3>
          <p
            className="mt-3"
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.6,
            }}
          >
            基于 40 年历史开彩数据，AI 将为你解读号码走势、冷热周期与关联模式。
          </p>
          <button
            type="button"
            disabled
            className="mt-5 font-sans"
            style={{
              borderRadius: 100,
              background: "rgba(160,125,224,0.15)",
              border: "1px solid rgba(160,125,224,0.35)",
              color: "#c4a7f0",
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            即将推出 →
          </button>
        </div>
      </section>
    </div>
  );
}
