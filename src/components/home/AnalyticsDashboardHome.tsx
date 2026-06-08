"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";
import type { TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/language-context";
import type { ColdNumberRow, HotNumberRow } from "@/types/analytics";
import type { Region } from "@/types";

const SEARCH_OPERATORS = [
  { id: "magnum", logo: "/logos/magnum.gif" },
  { id: "damacai", logo: "/logos/damacai.gif" },
  { id: "toto", logo: "/logos/toto.gif" },
  { id: "cashsweep", logo: "/logos/cashsweep.gif" },
  { id: "sabah", logo: "/logos/sabah88.gif" },
  { id: "sandakan", logo: "/logos/sandakan.gif" },
  { id: "singapore", logo: "/logos/sgpools.gif" },
] as const;

const LIVE_REGIONS: Region[] = ["west", "east", "cambodia", "singapore"];

const PARTICLES = [
  { top: "18%", left: "12%", size: 4, delay: "0s" },
  { top: "32%", left: "78%", size: 3, delay: "0.4s" },
  { top: "55%", left: "25%", size: 5, delay: "0.8s" },
  { top: "42%", left: "62%", size: 3, delay: "1.2s" },
  { top: "68%", left: "88%", size: 4, delay: "0.6s" },
];

function daysAgoLabel(
  dateISO: string | null,
  t: (key: TranslationKey) => string
): string {
  if (!dateISO) return "—";
  const today = todayMYT();
  const diff = Math.max(
    0,
    Math.round(
      (new Date(today).getTime() - new Date(dateISO).getTime()) / 86_400_000
    )
  );
  return `${diff} ${t("daysAgo")}`;
}

function formatDateShort(dateISO: string | null): string {
  if (!dateISO) return "—";
  const [y, m, d] = dateISO.split("-");
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

function HotCardSkeleton() {
  return (
    <div
      className="relative shrink-0 animate-pulse overflow-hidden rounded-2xl"
      style={{ width: 148, height: 180, backgroundColor: "rgba(255,255,255,0.06)" }}
    />
  );
}

function HotCard({
  row,
  rank,
  t,
}: {
  row: HotNumberRow;
  rank: number;
  t: (key: TranslationKey) => string;
}) {
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
        {daysAgoLabel(row.last_seen, t)}
      </span>
    </Link>
  );
}

function ColdCard({
  row,
  rank,
  t,
}: {
  row: ColdNumberRow;
  rank: number;
  t: (key: TranslationKey) => string;
}) {
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
            "radial-gradient(circle, rgba(255,176,32,0.25), Transparency 65%)",
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
        {t("never")}
      </span>
    </Link>
  );
}

interface AnalyticsDashboardHomeProps {
  initialHot: HotNumberRow[];
  initialCold: ColdNumberRow[];
}

export function AnalyticsDashboardHome({
  initialHot,
  initialCold,
}: AnalyticsDashboardHomeProps) {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const searchBarRef = useRef<HTMLDivElement>(null);
  const anyLive = useAnyRegionLive();
  const [hot, setHot] = useState<HotNumberRow[]>(initialHot);
  const [cold, setCold] = useState<ColdNumberRow[]>(initialCold);
  const [loading] = useState(false);
  const [searchNum, setSearchNum] = useState("");
  const [searchErr, setSearchErr] = useState(false);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const toggleOperator = (id: string) => {
    setSelectedOps((prev) =>
      prev.includes(id) ? prev.filter((op) => op !== id) : [...prev, id]
    );
  };

  const handleSearch = () => {
    const n = searchNum.trim();
    if (!/^\d{4}$/.test(n)) {
      setSearchErr(true);
      return;
    }
    const ops = selectedOps.length > 0 ? selectedOps.join(",") : "";
    const url = ops ? `/number/${n}?operators=${ops}` : `/number/${n}`;
    router.push(url);
  };

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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!searchExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(e.target as Node)
      ) {
        setSearchExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchExpanded]);

  const hero = hot[0];

  return (
    <div
      className="relative min-h-screen w-full"
      style={{ backgroundColor: "#070710" }}
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
        <button
          type="button"
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "6px 12px",
            color: "rgba(255,255,255,0.7)",
            fontFamily: "var(--font-jetbrains)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {lang === "zh" ? "EN" : "中文"}
        </button>
      </header>

      {/* 2. Hero — full-width background */}
      <section className="relative w-full" style={{ height: 480 }}>
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

        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div
            className="mx-auto w-full max-w-[390px] lg:max-w-3xl"
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
              {t("liveDrawing")}
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
            {t("todayHotNumber")}
          </p>

          <p
            className="mt-2 flex flex-wrap items-center gap-2"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}
          >
            <span>
              {t("appeared")} {hero?.total_hits ?? "—"} {t("times")}
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{formatDateShort(hero?.last_seen ?? null)}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{t("yearsData")}</span>
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href={hero && !loading ? `/number/${hero.number}` : "#"}
              onClick={!hero || loading ? (e) => e.preventDefault() : undefined}
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
              {t("viewDetails")}
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
              {t("liveDraw")}
            </Link>
          </div>
          </div>
        </div>
      </section>

      <div
        className="mx-auto w-full max-w-[390px] lg:max-w-3xl"
        style={{ position: "relative", paddingBottom: 100 }}
      >
      <div
        ref={searchBarRef}
        style={{ padding: "0 22px", marginBottom: 24 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${searchErr ? "#FF4D6D" : "rgba(0,229,255,0.15)"}`,
            borderRadius: 14,
            padding: "14px 16px",
            gap: 12,
            cursor: "text",
          }}
          onClick={() => setSearchExpanded(true)}
        >
          <input
            value={searchNum}
            onChange={(e) => {
              setSearchNum(e.target.value.replace(/\D/g, "").slice(0, 4));
              setSearchErr(false);
            }}
            onFocus={() => setSearchExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            inputMode="numeric"
            placeholder={t("searchNumber")}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-jetbrains)",
              fontSize: 16,
              color: "#fff",
              letterSpacing: "0.08em",
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSearch();
            }}
            aria-label="Search"
            style={{
              background: "rgba(0,229,255,0.15)",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00E5FF"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {searchExpanded && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.1em",
                marginBottom: 8,
                fontFamily: "var(--font-jetbrains)",
              }}
            >
              {t("selectOperator")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SEARCH_OPERATORS.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => toggleOperator(op.id)}
                  style={{
                    background: selectedOps.includes(op.id)
                      ? "rgba(0,229,255,0.12)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selectedOps.includes(op.id)
                      ? "rgba(0,229,255,0.4)"
                      : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 10,
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={op.logo}
                    alt={op.id}
                    style={{ height: 20, width: "auto" }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {searchErr && (
          <p
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "#FF4D6D",
              fontFamily: "var(--font-jetbrains)",
              letterSpacing: "0.08em",
            }}
          >
            {t("enterNumber")}
          </p>
        )}
      </div>

      {/* 3. Hot numbers */}
      <section className="mt-8">
        <div
          className="mb-4 flex items-center justify-between"
          style={{ padding: "0 22px" }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "white" }}>
            {t("weeklyHot")}
          </h2>
          <Link href="/rankings" style={{ fontSize: 12, color: "#00E5FF" }}>
            {t("viewAll")}
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
                <HotCard key={row.number} row={row} rank={i + 1} t={t} />
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
            {t("coldAlert")}
          </h2>
          <Link href="/rankings" style={{ fontSize: 12, color: "#00E5FF" }}>
            {t("viewAll")}
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
                <ColdCard key={row.number} row={row} rank={i + 1} t={t} />
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
              "radial-gradient(circle, rgba(160,125,224,0.35), Transparency 65%)",
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
            {t("aiAnalysis")}
          </h3>
          <p
            className="mt-3"
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.6,
            }}
          >
            {t("aiAnalysisDesc")}
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
            {t("comingSoon")}
          </button>
        </div>
      </section>
      </div>
    </div>
  );
}
