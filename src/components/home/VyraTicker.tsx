"use client";

import { saveBriefRegion } from "@/app/brief/BriefRegionRedirect";
import { todayMYT } from "@/lib/draw-time";
import { getNextAnyDraw } from "@/lib/next-draw";
import type { VyraRegion } from "@/lib/vyra/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const REGION_STORAGE_KEY = "vyra_region";
const CHAR_MS = 40;
const PAUSE_MS = 4000;
const FADE_MS = 300;
const TRUNCATE_LEN = 60;

const WEEKDAY_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

interface BriefSummaryResponse {
  empty?: boolean;
  brief_date?: string;
  intro?: string;
  narratives?: string[];
}

function readStoredRegion(): VyraRegion {
  try {
    const raw =
      localStorage.getItem(REGION_STORAGE_KEY) ??
      localStorage.getItem("vyra-brief-region");
    if (raw === "east" || raw === "singapore") return raw;
  } catch {
    /* ignore */
  }
  return "west";
}

function truncateLine(text: string): string {
  const t = text.trim();
  if (t.length <= TRUNCATE_LEN) return t;
  return `${t.slice(0, TRUNCATE_LEN)}…`;
}

function nextBriefDayLabel(): string {
  const { date } = getNextAnyDraw();
  return WEEKDAY_ZH[date.getUTCDay()];
}

function idleLine(): string {
  return `待机中 · 下次简报 ${nextBriefDayLabel()} 08:00`;
}

function staleDateBadge(briefDate: string): string {
  const [, m, d] = briefDate.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useTypewriter(lines: string[], reducedMotion: boolean) {
  const [display, setDisplay] = useState("");
  const [fading, setFading] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  const singleLine = lines.length <= 1;

  useEffect(() => {
    setDisplay("");
    setFading(false);
    setLineIdx(0);
    setCharIdx(0);
  }, [lines]);

  useEffect(() => {
    if (lines.length === 0) return;

    if (reducedMotion) {
      setDisplay(lines[0]);
      setCharIdx(lines[0].length);
      return;
    }

    const line = lines[lineIdx] ?? "";

    if (charIdx < line.length) {
      const t = window.setTimeout(() => {
        setDisplay(line.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, CHAR_MS);
      return () => window.clearTimeout(t);
    }

    if (singleLine) return;

    let fadeTimer: number;
    const pauseTimer = window.setTimeout(() => {
      setFading(true);
      fadeTimer = window.setTimeout(() => {
        setFading(false);
        setLineIdx((i) => (i + 1) % lines.length);
        setCharIdx(0);
        setDisplay("");
      }, FADE_MS);
    }, PAUSE_MS);

    return () => {
      window.clearTimeout(pauseTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [lines, lineIdx, charIdx, reducedMotion, singleLine]);

  return { display, fading };
}

export function VyraTicker() {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const [region, setRegion] = useState<VyraRegion>("west");
  const [summary, setSummary] = useState<BriefSummaryResponse | null>(null);
  const [sweep, setSweep] = useState(true);

  useEffect(() => {
    setRegion(readStoredRegion());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/vyra/brief-summary?region=${region}`)
      .then((r) => r.json())
      .then((json: BriefSummaryResponse) => {
        if (!cancelled) setSummary(json);
      })
      .catch(() => {
        if (!cancelled) setSummary({ empty: true });
      });
    return () => {
      cancelled = true;
    };
  }, [region]);

  useEffect(() => {
    const t = window.setTimeout(() => setSweep(false), 600);
    return () => window.clearTimeout(t);
  }, []);

  const lines = useMemo(() => {
    if (!summary || summary.empty) return [idleLine()];
    const out: string[] = [];
    if (summary.intro?.trim()) out.push(truncateLine(summary.intro));
    for (const n of summary.narratives ?? []) {
      if (n?.trim()) out.push(truncateLine(n));
    }
    return out.length > 0 ? out : [idleLine()];
  }, [summary]);

  const { display, fading } = useTypewriter(lines, reducedMotion);

  const isStale =
    summary?.brief_date != null && summary.brief_date < todayMYT();

  const onClick = useCallback(() => {
    try {
      localStorage.setItem(REGION_STORAGE_KEY, region);
    } catch {
      /* ignore */
    }
    saveBriefRegion(region);
    router.push(`/brief/${region}`);
  }, [region, router]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-11 w-full items-center gap-2 overflow-hidden rounded-lg border border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.06)] px-3 text-left ${sweep ? "vyra-ticker-sweep" : ""}`}
      style={{ cursor: "pointer" }}
    >
      <style>{`
        @keyframes vyraTickerBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes vyraTickerSweep {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        .vyra-ticker-sweep::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(167, 139, 250, 0.35),
            transparent
          );
          animation: vyraTickerSweep 0.6s ease-out forwards;
          pointer-events: none;
        }
        .vyra-ticker-cursor {
          animation: vyraTickerBlink 530ms step-end infinite;
        }
      `}</style>

      <span
        className="shrink-0 font-mono text-xs font-bold"
        style={{ color: "#A78BFA" }}
      >
        ◤ VYRA
      </span>

      <span
        className="min-w-0 flex-1 truncate font-mono text-xs"
        style={{
          color: "rgba(255,255,255,0.82)",
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      >
        {isStale && summary?.brief_date && (
          <span
            className="mr-1.5 inline-block rounded px-1 py-px font-sans text-[10px] font-medium"
            style={{
              color: "rgba(167,139,250,0.9)",
              background: "rgba(167,139,250,0.12)",
              verticalAlign: "middle",
            }}
          >
            {staleDateBadge(summary.brief_date)}
          </span>
        )}
        {display || "\u00A0"}
      </span>

      <span
        className="vyra-ticker-cursor shrink-0 font-mono text-xs"
        style={{ color: "#A78BFA" }}
        aria-hidden
      >
        ▌
      </span>

      <span
        className="shrink-0 text-xs"
        style={{ color: "var(--text-dim)" }}
      >
        全文 →
      </span>
    </button>
  );
}
