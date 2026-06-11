"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useLang } from "@/lib/language-context";
import {
  damacai3D,
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
  mapDamacai3Plus3DExtra,
  mapMagnumGoldExtra,
  mapMagnumLifeExtra,
  mapToto5DExtra,
  mapToto6DTiers,
  mapTotoLottoGames,
} from "@/lib/extra-data-mapper";
import {
  type DbDrawRow,
  mergeDrawResult,
} from "@/lib/results-mapper";
import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";
import { formatTimeMYT } from "@/lib/number-utils";
import type { DrawResult, Region } from "@/types";
import { Damacai3DCard } from "./Damacai3DCard";
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

const POLL_LIVE_MS = 3_000;
const POLL_IDLE_MS = 60_000;

function pollIntervalMs(region: Region): number {
  return isRegionLiveDraw(region) ? POLL_LIVE_MS : POLL_IDLE_MS;
}

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
          className="subpage-card overflow-hidden animate-pulse"
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
  inLiveWindow: boolean,
  today: string
): DrawResult[] {
  return keys.map((op) => {
    const mock = mocks.find((d) => d.operator === op)!;
    return mergeDrawResult(mock, operators[op], inLiveWindow, today);
  });
}

export function LiveTerminal() {
  const { t } = useLang();
  const [region, setRegion] = useState<Region>("west");
  const [results, setResults] = useState<Record<string, DbDrawRow>>({});
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
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
    setResults({});
    setIsInitialized(false);
  }, [region]);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    let paused = document.visibilityState === "hidden";
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let abortController: AbortController | null = null;

    const scheduleNext = () => {
      if (cancelled || paused) return;
      timeoutId = setTimeout(() => {
        void tick();
      }, pollIntervalMs(region));
    };

    const applyPayload = (data: {
      operators?: Record<string, DbDrawRow>;
      isLive?: boolean;
      inLiveWindow?: boolean;
      error?: string;
    }) => {
      if (data.error) return;
      if (data.operators) {
        setResults(data.operators);
        const liveWindow = data.inLiveWindow ?? data.isLive ?? false;
        setIsLive(liveWindow);
        setLastUpdate(new Date());
        setIsInitialized(true);
      }
    };

    const tick = async () => {
      if (cancelled || paused) return;

      abortController?.abort();
      abortController = new AbortController();

      try {
        const res = await fetch(`/api/results?region=${region}`, {
          signal: abortController.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) applyPayload(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        if (!cancelled && !paused) scheduleNext();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        paused = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        abortController?.abort();
        return;
      }
      paused = false;
      void tick();
    };

    document.addEventListener("visibilitychange", onVisibility);
    void tick();

    return () => {
      cancelled = true;
      paused = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (timeoutId) clearTimeout(timeoutId);
      abortController?.abort();
    };
  }, [mounted, region]);

  const inLiveWindowActive = mounted && isLive;

  const westMain4DDisplay = useMemo(
    () =>
      mergeRegionDraws(
        westMain4D,
        results,
        WEST_OPERATORS,
        inLiveWindowActive,
        todayStr
      ),
    [results, inLiveWindowActive, todayStr]
  );

  const eastMain4DDisplay = useMemo(
    () =>
      mergeRegionDraws(
        eastMain4D,
        results,
        EAST_OPERATORS,
        inLiveWindowActive,
        todayStr
      ),
    [results, inLiveWindowActive, todayStr]
  );

  const singapore4DDisplay = useMemo(
    () =>
      mergeDrawResult(
        singapore4D,
        results["sgpools"],
        inLiveWindowActive,
        todayStr
      ),
    [results, inLiveWindowActive, todayStr]
  );

  const magnumDraw = westMain4DDisplay[0];
  const damacaiDraw = westMain4DDisplay[1];
  const totoDraw = westMain4DDisplay[2];

  const magnumExtra = results["magnum"]?.extra_data as
    | Record<string, unknown>
    | undefined;
  const damacaiExtra = results["damacai"]?.extra_data as
    | Record<string, unknown>
    | undefined;
  const totoExtra = results["toto"]?.extra_data as
    | Record<string, unknown>
    | undefined;

  const magnumGoldData = useMemo(
    () => mapMagnumGoldExtra(magnumExtra?.gold, magnumGold),
    [magnumExtra]
  );
  const magnumLifeData = useMemo(
    () => mapMagnumLifeExtra(magnumExtra?.life, magnumLife),
    [magnumExtra]
  );
  const damacai3DData = useMemo(() => damacai3D, []);
  const damacai3Plus3DData = useMemo(
    () =>
      mapDamacai3Plus3DExtra(damacaiExtra?.damacai3Plus3D, damacai3Plus3D),
    [damacaiExtra]
  );
  const toto5DData = useMemo(
    () => mapToto5DExtra(totoExtra?.toto5D, toto5D),
    [totoExtra]
  );
  const toto6DData = useMemo(
    () => mapToto6DTiers(totoExtra?.toto6D, toto6DTiers),
    [totoExtra]
  );
  const totoLottoData = useMemo(
    () =>
      mapTotoLottoGames(totoExtra?.totoLotto, totoLottoGames, {
        date: totoDraw.date,
        draw_no: totoDraw.draw_no,
        status: totoDraw.status,
      }),
    [totoExtra, totoDraw.date, totoDraw.draw_no, totoDraw.status]
  );

  return (
    <>
      <PageLayout
        title="LI"
        titleAccent="VE"
        subtitle={t("liveSubtitle")}
        rightAction={
          <Link href="/draws" style={{ fontSize: 10, color: "rgba(0,229,255,0.6)", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em", textDecoration: "none", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 8, padding: "5px 12px", background: "rgba(0,229,255,0.05)", whiteSpace: "nowrap" }}>
            {t("drawRecords")} →
          </Link>
        }
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-live/15 border border-live/30 px-2 py-0.5 text-[10px] font-bold text-live uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
              LIVE
            </span>
          ) : (
            <span />
          )}
        </div>

        <RegionTabs active={region} onChange={setRegion} />
        <DrawScheduleBar region={region} isLive={isLive} />

        <main className="min-w-0 pt-3">
            {/* ADSENSE_SLOT_TOP */}

            {!isInitialized ? (
              <LoadingSkeleton cols={region === "singapore" ? 2 : 3} />
            ) : (
              <>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MagnumGoldCard
                    date={magnumDraw.date}
                    draw_no={magnumDraw.draw_no}
                    status={magnumDraw.status}
                    data={magnumGoldData}
                  />
                  <MagnumLifeCard
                    date={magnumDraw.date}
                    draw_no={magnumDraw.draw_no}
                    status={magnumDraw.status}
                    data={magnumLifeData}
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
                      prizes={toto5DData}
                    />
                    <SixDCard
                      displayName="Sports Toto 6D"
                      date={totoDraw.date}
                      draw_no={totoDraw.draw_no}
                      status={totoDraw.status}
                      tiers={toto6DData}
                    />
                  </div>
                  <TotoLottoCombinedCard
                    games={totoLottoData}
                    date={totoDraw.date}
                    draw_no={totoDraw.draw_no}
                    status={totoDraw.status}
                  />
                </div>

                <SectionTitle>{t("damacaiOther")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Damacai3DCard
                    date={damacaiDraw.date}
                    draw_no={damacaiDraw.draw_no}
                    status={damacaiDraw.status}
                    data={damacai3DData}
                  />
                  <Damacai3Plus3DCard
                    date={damacaiDraw.date}
                    draw_no={damacaiDraw.draw_no}
                    status={damacaiDraw.status}
                    data={damacai3Plus3DData}
                  />
                </div>
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
                    status={inLiveWindowActive ? "pending" : "drawn"}
                    data={sabah3D}
                  />
                  {sabahLottoGames.map((g) => (
                    <LottoBallCard
                      key={g.displayName}
                      data={{
                        ...g,
                        status: inLiveWindowActive ? "pending" : g.status,
                      }}
                    />
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
                  <LottoBallCard
                    data={{
                      ...singaporeToto,
                      status: inLiveWindowActive ? "pending" : singaporeToto.status,
                    }}
                  />
                </CardGrid>
              </>
            )}
              </>
            )}

            <p className="mt-8 text-center text-xs text-dim">
              {t("updatedAt")}{" "}
              <span>{updateTime || "--:--:--"}</span>
            </p>
        </main>
        {/* ADSENSE_SLOT_SIDEBAR */}
      </PageLayout>
    </>
  );
}
