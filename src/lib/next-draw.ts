import { getMYTParts } from "@/lib/draw-time";
import type { Region } from "@/types";

const DRAW_DAYS_WSS = [0, 3, 6];
const FOUR_D_DOW = [0, 3, 6];
const TOTO_DOW = [1, 4];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface NextDrawInfo {
  date: Date;
  kind: "4d" | "sg_toto";
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
}

/** MYT wall-clock instant as UTC Date (same convention as getMYTParts). */
function dateAtMYT(iso: string, hour: number, minute: number): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 8, minute, 0, 0));
}

/** Next draw across all games: 4D (Sun/Wed/Sat 19:00 MYT) vs SG Toto (Mon/Thu 21:30 MYT). */
export function getNextAnyDraw(now = new Date()): NextDrawInfo {
  const { date } = getMYTParts(now);
  const candidates: NextDrawInfo[] = [];

  for (let offset = 0; offset < 8; offset++) {
    const iso = addDaysIso(date, offset);
    const [y, m, d] = iso.split("-").map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

    if (FOUR_D_DOW.includes(wd)) {
      const at = dateAtMYT(iso, 19, 0);
      if (at.getTime() > now.getTime()) {
        candidates.push({ date: at, kind: "4d" });
      }
    }
    if (TOTO_DOW.includes(wd)) {
      const at = dateAtMYT(iso, 21, 30);
      if (at.getTime() > now.getTime()) {
        candidates.push({ date: at, kind: "sg_toto" });
      }
    }
  }

  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  if (candidates.length > 0) return candidates[0];

  const fallbackIso = addDaysIso(date, 1);
  return { date: dateAtMYT(fallbackIso, 19, 0), kind: "4d" };
}

function drawDaysForRegion(region: Region): number[] {
  if (region === "singapore") return DRAW_DAYS_WSS;
  return DRAW_DAYS_WSS;
}

function drawCutoffHour(region: Region): number {
  if (region === "east") return 19.5;
  if (region === "singapore") return 19.5;
  return 20;
}

/** Next scheduled draw date label for header bar (MYT) */
export function getNextDrawDate(
  region: Region,
  now = new Date()
): { day: string; dateLabel: string; iso: string } {
  const { day, hour, minute, date } = getMYTParts(now);
  const drawDays = drawDaysForRegion(region);
  const cutoff = drawCutoffHour(region);
  const nowFrac = hour + minute / 60;

  for (let offset = 0; offset < 14; offset++) {
    const iso = addDaysIso(date, offset);
    const [y, m, d] = iso.split("-").map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (!drawDays.includes(wd)) continue;

    if (offset === 0 && nowFrac >= cutoff) continue;

    const dayName = DAY_SHORT[wd];
    const dateLabel = `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
    return { day: dayName, dateLabel, iso };
  }

  return { day: DAY_SHORT[day], dateLabel: date.replace(/-/g, "-"), iso: date };
}
