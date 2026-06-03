import type { Region } from "@/types";

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

export interface MYTParts {
  day: number;
  hour: number;
  minute: number;
  date: string;
}

/** Current calendar parts in Malaysia Time (UTC+8) */
export function getMYTParts(now = new Date()): MYTParts {
  const myt = new Date(now.getTime() + MYT_OFFSET_MS);
  return {
    day: myt.getUTCDay(),
    hour: myt.getUTCHours(),
    minute: myt.getUTCMinutes(),
    date: myt.toISOString().split("T")[0],
  };
}

export function todayMYT(now = new Date()): string {
  return getMYTParts(now).date;
}

function inWindow(
  hour: number,
  minute: number,
  startH: number,
  startM: number,
  endH: number,
  endM: number
): boolean {
  const t = hour * 60 + minute;
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  return t >= start && t < end;
}

const DRAW_DAYS_WSS = [0, 3, 6]; // Sun, Wed, Sat

/** Whether today (MYT) is a scheduled draw day for the region — weekday only */
export function isDrawDay(region: Region, now = new Date()): boolean {
  const { day } = getMYTParts(now);
  switch (region) {
    case "west":
    case "east":
    case "singapore":
      return DRAW_DAYS_WSS.includes(day);
    case "cambodia":
      return true;
    default:
      return false;
  }
}

/** Draw day + within 10 minutes before regional draw time (MYT) */
export function isDrawDayAndNearDraw(region: Region, now = new Date()): boolean {
  const { hour, minute } = getMYTParts(now);
  if (!isDrawDay(region, now)) return false;

  const t = hour * 60 + minute;
  switch (region) {
    case "west":
      return t >= 18 * 60 + 50;
    case "east":
      return t >= 18 * 60 + 20;
    case "singapore":
      return t >= 18 * 60 + 20;
    case "cambodia":
      return t >= 18 * 60 + 50;
    default:
      return false;
  }
}

/**
 * Regional live draw windows (MYT):
 * - west: Sun/Wed/Sat 19:00–20:00
 * - east: Sun/Wed/Sat 18:30–19:30
 * - cambodia: daily 19:00–20:00
 * - singapore 4D: Sun/Wed/Sat 18:30–19:30
 * - singapore Toto: Mon/Thu ~21:30 (21:30–22:30 window)
 */
export function isRegionLiveDraw(
  region: Region,
  now = new Date(),
  mockLive = false
): boolean {
  if (mockLive) return true;

  const { day, hour, minute } = getMYTParts(now);

  switch (region) {
    case "west":
      return (
        DRAW_DAYS_WSS.includes(day) &&
        inWindow(hour, minute, 19, 0, 20, 0)
      );
    case "east":
      return (
        DRAW_DAYS_WSS.includes(day) &&
        inWindow(hour, minute, 18, 30, 19, 30)
      );
    case "cambodia":
      return inWindow(hour, minute, 19, 0, 20, 0);
    case "singapore": {
      const sg4d =
        DRAW_DAYS_WSS.includes(day) &&
        inWindow(hour, minute, 18, 30, 19, 30);
      const sgToto =
        [1, 4].includes(day) && inWindow(hour, minute, 21, 30, 22, 30);
      return sg4d || sgToto;
    }
    default:
      return false;
  }
}

/** @deprecated Use isRegionLiveDraw(region) */
export function isLiveDrawTime(region: Region = "west", now = new Date()): boolean {
  return isRegionLiveDraw(region, now);
}

export function shouldScrapeOnLive(region: Region): boolean {
  return (
    region === "west" ||
    region === "cambodia" ||
    region === "east" ||
    region === "singapore"
  );
}

/** MYT 18:50–19:30 — peak draw window for faster polling */
export function isDrawWindowMYT(now = new Date()): boolean {
  const { hour, minute } = getMYTParts(now);
  const t = hour * 60 + minute;
  return t >= 18 * 60 + 50 && t < 19 * 60 + 30;
}

export function getRefreshIntervalMs(now = new Date()): number {
  return isDrawWindowMYT(now) ? 15_000 : 120_000;
}

export function getRefreshIntervalLabelKey(
  now = new Date()
): "every15Sec" | "every2Min" {
  return isDrawWindowMYT(now) ? "every15Sec" : "every2Min";
}

export function getResultsPollIntervalMs(now = new Date()): number {
  return getRefreshIntervalMs(now);
}

export const LIVE_CACHE_MS = 15_000;
