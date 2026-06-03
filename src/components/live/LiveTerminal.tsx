"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { MainNav } from "@/components/layout/MainNav";
import { LuckyModal } from "@/components/ui/LuckyModal";
import { useLang } from "@/lib/language-context";
import { getRefreshIntervalMs } from "@/lib/draw-time";
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

function mergeRegionDraws(
  mocks: DrawResult[],
  operators: Record<string, DbDrawRow>,
  keys: readonly string[]
): DrawResult[] {
  return keys.map((op) => {
    const mock = mocks.find((d) => d.operator === op)!;
    return mergeDrawResult(mock, operators[op]);
  });
}

function mergeWestMain4D(operators: Record<string, DbDrawRow>): DrawResult[] {
  return mergeRegionDraws(westMain4D, operators, WEST_OPERATORS);
}

function getRefreshInterval(isLive: boolean): number {
  return getRefreshIntervalMs(isLive);
}

export function LiveTerminal() {
  const { t } = useLang();
  const [region, setRegion] = useState<Region>("west");
  const [results, setResults] = useState<Record<string, DbDrawRow>>({});
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [luckyOpen, setLuckyOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const res = await fetch(`/api/results?region=${region}&t=${Date.now()}`);
        const data = await res.json();
        const live = Boolean(data.isLive);
        if (data.operators) {
          setResults(data.operators as Record<string, DbDrawRow>);
          setIsLive(live);
          setLastUpdate(new Date());
        }
        if (live) {
          const otherRegions: Region[] = (
            ["west", "east", "cambodia", "singapore"] as Region[]
          ).filter((r) => r !== region);
          otherRegions.forEach((r) =>
            fetch(`/api/results?region=${r}&t=${Date.now()}`)
          );
        }
        if (interval) clearInterval(interval);
        interval = setInterval(poll, getRefreshInterval(live));
      } catch (err) {
        console.error("Failed to fetch results:", err);
      }
    };

    poll();
    interval = setInterval(poll, 30_000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [region]);

  const westMain4DDisplay = useMemo(
    () => mergeWestMain4D(results),
    [results]
  );

  const eastMain4DDisplay = useMemo(
    () => mergeRegionDraws(eastMain4D, results, EAST_OPERATORS),
    [results]
  );

  const cambodiaMain4DDisplay = useMemo(
    () => mergeRegionDraws(cambodiaMain4D, results, CAMBODIA_OPERATORS),
    [results]
  );

  const singapore4DDisplay = useMemo(
    () => mergeDrawResult(singapore4D, results["sgpools"]),
    [results]
  );

  const magnumDraw = westMain4DDisplay[0];
  const damacaiDraw = westMain4DDisplay[1];
  const totoDraw = westMain4DDisplay[2];

  const updateTime = lastUpdate
    ? formatTimeMYT(lastUpdate)
    : formatTimeMYT(new Date());

  return (
    <>
      <div className="min-h-screen bg-surface">
        <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
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
          <div className="mx-auto max-w-7xl px-4 pb-2">
            <RegionTabs active={region} onChange={setRegion} />
          </div>
          <DrawScheduleBar region={region} isLive={isLive} />
        </header>

        <div className="mx-auto max-w-7xl px-4 py-3">
          <main className="min-w-0">
            {/* ADSENSE_SLOT_TOP */}

            {region === "west" && (
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
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3 items-start">
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
            )}

            {region === "east" && (
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
                    status="drawn"
                    data={sabah3D}
                  />
                  {sabahLottoGames.map((g) => (
                    <LottoBallCard key={g.displayName} data={g} />
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
            )}

            {region === "singapore" && (
              <>
                <p className="text-sm text-muted mb-4">
                  {regionLabels.singapore.schedule}
                </p>
                <CardGrid cols={2}>
                  <ResultCard data={singapore4DDisplay} />
                  <LottoBallCard data={singaporeToto} />
                </CardGrid>
              </>
            )}

            <p className="mt-8 text-center text-xs text-dim">
              {t("updatedAt")}{" "}
              <span suppressHydrationWarning>
                {mounted ? updateTime : "--:--:--"}
              </span>
            </p>
          </main>
          {/* ADSENSE_SLOT_SIDEBAR */}
        </div>
      </div>
      <LuckyModal open={luckyOpen} onClose={() => setLuckyOpen(false)} />
    </>
  );
}
