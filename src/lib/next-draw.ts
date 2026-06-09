import { getMYTParts } from "@/lib/draw-time";
import type { Region } from "@/types";

const DRAW_DAYS_WSS = [0, 3, 6];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
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
