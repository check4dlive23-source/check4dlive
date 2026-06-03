"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { MainNav } from "@/components/layout/MainNav";
import { LuckyModal } from "@/components/ui/LuckyModal";
import { useLang } from "@/lib/language-context";
import {
  cambodiaMain4D,
  damacai3Plus3D,
  eastMain4D,
  magnumGold,
  magnumLife,
  regionLabels,
  sabah3D,
  sabahLottoGames,
  singapore4D,
  singaporeToto,
  toto5D,
  toto6DTiers,
  totoLottoGames,
  westMain4D,
} from "@/lib/mock-data";
import {
  type DbDrawRow,
  mergeDrawResult,
} from "@/lib/results-mapper";
import { todayMYT } from "@/lib/draw-time";
import { formatTimeMYT } from "@/lib/number-utils";
import type { DrawResult, Region } from "@/types";
import { Damacai3Plus3DCard } from "./Damacai3Plus3DCard";
import { FiveDCard } from "./FiveDCard";
import { LottoBallCard } from "./LottoBallCard";
import { TotoLottoCombinedCard } from "./TotoLottoCombinedCard";
import { MagnumGoldCard } from "./MagnumGoldCard";
import { MagnumLifeCard } from "./MagnumLifeCard";
import { DrawScheduleBar } from "./DrawScheduleBar";
import { RegionTabs } from "./RegionTabs";
import { ResultCard } from "./ResultCard";
import { Sabah3DCard } from "./Sabah3DCard";
import { SixDCard } from "./SixDCard";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mt-3 mb-2 first:mt-0">
      {children}
    </h2>
  );
}

function CardGrid({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={
        cols === 3
          ? "grid grid-cols-1 md:grid-cols-3 gap-3"
          : "grid grid-cols-1 md:grid-cols-2 gap-3"
      }
    >
      {children}
    </div>
  );
}

const WEST_OPERATORS = ["magnum", "damacai", "toto"] as const;
const EAST_OPERATORS = ["sabah", "sarawak", "sandakan"] as const;
const CAMBODIA_OPERATORS = ["gd", "perdana", "hari"] as const;

function LoadingSkeleton({ cols = 3 }: { cols?: 2 | 3 }) {
  const count = cols === 3 ? 3 : 2;
  return (
    <div
      className={
        cols === 3
          ? "grid grid-cols-1 md:grid-cols-3 gap-3"
          : "grid grid-cols-1 md:grid-cols-2 gap-3"
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-line bg-surface-2 overflow-hidden animate-pulse"
        >
          <div className="h-12 bg-surface-3 border-b border-line" />
          <div className="h-10 bg-surface-3 border-b border-line" />
          <div className="grid grid-cols-3 gap-2 p-3">
            <div className="h-12 rounded bg-surface-3" />
            <div className="h-12 rounded bg-surface-3" />
            <div className="h-12 rounded bg-surface-3" />
          </div>
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }).map((_, j) => (
                <div key={j} className="h-8 rounded bg-surface-3" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function mergeRegionDraws(
  mocks: DrawResult[],
  operators: Record<string, DbDrawRow>,
  keys: readonly string[],
  isDrawDay: boolean,
  today: string
): DrawResult[] {
  return keys.map((op) => {
    const mock = mocks.find((d) => d.operator === op)!;
    return mergeDrawResult(mock, operators[op], isDrawDay, today);
  });
}

export function LiveTerminal() {
  const { t } = useLang();
  const [region, setRegion] = useState<Region>("west");
  const [results, setResults] = useState<Record<string, DbDrawRow>>({});
  const [isLive, setIsLive] = useState(false);
  const [isDrawDay, setIsDrawDay] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [luckyOpen, setLuckyOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [todayStr, setTodayStr] = useState("");
  const [updateTime, setUpdateTime] = useState("");

  useEffect(() => {
    setMounted(true);
    setTodayStr(todayMYT());
  }, []);

  useEffect(() => {
    setUpdateTime(
      lastUpdate ? formatTimeMYT(lastUpdate) : formatTimeMYT(new Date())
    );
  }, [lastUpdate]);

  useEffect(() => {
    setIsInitialized(false);
  }, [region]);

  useEffect(() => {
    if (!mounted) return;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es?.close();
      es = new EventSource(`/api/results/stream?region=${region}`);

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.error) {
            console.error("SSE error:", data.error);
            return;
          }
          setResults((data.operators ?? {}) as Record<string, DbDrawRow>);
          setIsLive(data.isLive ?? false);
          setIsDrawDay(data.isDrawDay ?? false);
          setLastUpdate(new Date());
          setIsInitialized(true);
        } catch (err) {
          console.error("SSE parse failed:", err);
        }
      };

      es.onerror = () => {
        es?.close();
        if (!closed) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [mounted, region]);

  const drawDayActive = mounted && isDrawDay;

  const westMain4DDisplay = useMemo(
    () =>
      mergeRegionDraws(
        westMain4D,
        results,
        WEST_OPERATORS,
        drawDayActive,
        todayStr
      ),
    [results, drawDayActive, todayStr]
  );

  const eastMain4DDisplay = useMemo(
    () =>
      mergeRegionDraws(
        eastMain4D,
        results,
        EAST_OPERATORS,
        drawDayActive,
        todayStr
      ),
    [results, drawDayActive, todayStr]
  );

  const cambodiaMain4DDisplay = useMemo(
    () =>
      mergeRegionDraws(
        cambodiaMain4D,
        results,
        CAMBODIA_OPERATORS,
        drawDayActive,
        todayStr
      ),
    [results, drawDayActive, todayStr]
  );

  const singapore4DDisplay = useMemo(
    () =>
      mergeDrawResult(singapore4D, results["sgpools"], drawDayActive, todayStr),
    [results, drawDayActive, todayStr]
  );

  const magnumDraw = westMain4DDisplay[0];
  const damacaiDraw = westMain4DDisplay[1];
  const totoDraw = westMain4DDisplay[2];

  return (
    <>
      <div className="min-h-screen bg-surface pb-16 sm:pb-0">
        <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-2 sm:px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                Check 4D Live
              </h1>
              {isLive && (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-live/15 border border-live/30 px-2 py-0.5 text-[10px] font-bold text-live uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
          <div className="flex shrink-0 items-center gap-2">
            <MainNav />
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setLuckyOpen(true)}
              className="rounded-lg border border-line-strong bg-surface-3 px-3 py-1.5 text-sm text-foreground hover:bg-surface-4 transition-colors"
              aria-haspopup="dialog"
            >
              {t("lucky")}
            </button>
          </div>
          </div>
          <div className="mx-auto max-w-7xl px-2 sm:px-4 pb-2">
            <RegionTabs active={region} onChange={setRegion} />
          </div>
          <DrawScheduleBar region={region} isLive={isLive} />
        </header>

        <div className="mx-auto max-w-7xl px-2 sm:px-4 py-3">
          <main className="min-w-0">
            {/* ADSENSE_SLOT_TOP */}

            {!isInitialized ? (
              <LoadingSkeleton cols={region === "singapore" ? 2 : 3} />
            ) : region === "west" ? (
              <>
                <p className="text-sm text-muted mb-3">
                  {regionLabels.west.schedule}
                </p>
                <CardGrid cols={3}>
                  {westMain4DDisplay.map((d) => (
                    <ResultCard key={d.operator} data={d} />
                  ))}
                </CardGrid>

                {/* ADSENSE_SLOT_BETWEEN */}

                <SectionTitle>{t("magnumOther")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MagnumGoldCard
                    date={magnumDraw.date}
                    draw_no={magnumDraw.draw_no}
                    status={magnumDraw.status}
                    data={magnumGold}
                  />
                  <MagnumLifeCard
                    date={magnumDraw.date}
                    draw_no={magnumDraw.draw_no}
                    status={magnumDraw.status}
                    data={magnumLife}
                  />
                </div>

                <SectionTitle>{t("totoOther")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <div className="flex flex-col gap-3">
                    <FiveDCard
                      displayName="Sports Toto 5D"
                      date={totoDraw.date}
                      draw_no={totoDraw.draw_no}
                      status={totoDraw.status}
                      prizes={toto5D}
                    />
                    <SixDCard
                      displayName="Sports Toto 6D"
                      date={totoDraw.date}
                      draw_no={totoDraw.draw_no}
                      status={totoDraw.status}
                      tiers={toto6DTiers}
                    />
                  </div>
                  <TotoLottoCombinedCard
                    games={totoLottoGames}
                    date={totoDraw.date}
                    draw_no={totoDraw.draw_no}
                    status={totoDraw.status}
                  />
                </div>

                <SectionTitle>{t("damacaiOther")}</SectionTitle>
                <Damacai3Plus3DCard
                  date={damacaiDraw.date}
                  draw_no={damacaiDraw.draw_no}
                  status={damacaiDraw.status}
                  data={damacai3Plus3D}
                />
              </>
            ) : region === "east" ? (
              <>
                <p className="text-sm text-muted mb-4">
                  {regionLabels.east.schedule}
                </p>
                <CardGrid cols={3}>
                  {eastMain4DDisplay.map((d) => (
                    <ResultCard key={d.operator} data={d} />
                  ))}
                </CardGrid>

                {/* ADSENSE_SLOT_BETWEEN */}

                <SectionTitle>{t("sabahOther")}</SectionTitle>
                <CardGrid>
                  <Sabah3DCard
                    date={eastMain4DDisplay[0]?.date}
                    draw_no={eastMain4DDisplay[0]?.draw_no}
                    status={drawDayActive ? "pending" : "drawn"}
                    data={sabah3D}
                  />
                  {sabahLottoGames.map((g) => (
                    <LottoBallCard
                      key={g.displayName}
                      data={{
                        ...g,
                        status: drawDayActive ? "pending" : g.status,
                      }}
                    />
                  ))}
                </CardGrid>
              </>
            )}

            {region === "cambodia" && (
              <>
                <p className="text-sm text-muted mb-4">
                  {regionLabels.cambodia.schedule}
                </p>
                <CardGrid cols={3}>
                  {cambodiaMain4DDisplay.map((d) => (
                    <ResultCard key={d.operator} data={d} />
                  ))}
                </CardGrid>
              </>
            ) : region === "singapore" ? (
              <>
                <p className="text-sm text-muted mb-4">
                  {regionLabels.singapore.schedule}
                </p>
                <CardGrid cols={2}>
                  <ResultCard data={singapore4DDisplay} />
                  <LottoBallCard
                    data={{
                      ...singaporeToto,
                      status: drawDayActive ? "pending" : singaporeToto.status,
                    }}
                  />
                </CardGrid>
              </>
            ) : null}

            <p className="mt-8 text-center text-xs text-dim">
              {t("updatedAt")}{" "}
              <span>{updateTime || "--:--:--"}</span>
            </p>
          </main>
          {/* ADSENSE_SLOT_SIDEBAR */}
        </div>
      </div>
      <LuckyModal open={luckyOpen} onClose={() => setLuckyOpen(false)} />
    </>
  );
}
