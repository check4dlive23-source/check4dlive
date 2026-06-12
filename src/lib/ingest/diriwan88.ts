import { parseMoney } from "@/lib/ingest/parse-check4d";

const BASE = "https://www.diriwan88.com/App88/Result/Result.asp";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const TIMEOUT_MS = 10_000;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface Sabah645Official {
  balls: number[];
  bonus: number;
  jackpot1: number;
  jackpot2: number;
  draw_no?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dateIsoToParams(dateIso: string): {
  month: string;
  year: string;
  drawDate: string;
} | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!m) return null;
  const year = m[1];
  const monthNum = parseInt(m[2], 10);
  const day = m[3];
  if (monthNum < 1 || monthNum > 12) return null;
  return {
    month: MONTHS[monthNum - 1],
    year,
    drawDate: `${year}${m[2]}${day}`,
  };
}

function parseDrawNo(html: string, drawDate: string): string | undefined {
  const re = new RegExp(
    `Draw\\s+No\\s*:\\s*(\\d{4}/\\d{2})[^>]*DrawDate=${drawDate}`,
    "i"
  );
  return html.match(re)?.[1];
}

function parseLodBox(html: string): Omit<Sabah645Official, "draw_no"> | null {
  const box = html.match(/class="LODBox"[\s\S]*?(?=class="L7DBox")/i);
  if (!box) return null;

  const text = stripHtml(box[0]);
  const ballsMatch = text.match(
    /SABAH\s+LOTTO\s+((?:\d{1,2}\s+){5}\d{1,2})\s*\+\s*(\d{1,2})/i
  );
  if (!ballsMatch) return null;

  const balls = ballsMatch[1]
    .trim()
    .split(/\s+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 45);
  const bonus = parseInt(ballsMatch[2], 10);
  if (balls.length !== 6 || !Number.isFinite(bonus) || bonus < 1 || bonus > 45) {
    return null;
  }

  const moneyParts = Array.from(
    text.matchAll(/RM\s*([\d,]+(?:\.\d{1,2})?)/gi)
  );
  const amounts = moneyParts
    .map((m) => parseMoney(`RM ${m[1]}`))
    .filter((n): n is number => n != null);
  if (amounts.length < 2) return null;

  return {
    balls,
    bonus,
    jackpot1: amounts[0],
    jackpot2: amounts[1],
  };
}

function resultUrl(dateIso: string): string | null {
  const p = dateIsoToParams(dateIso);
  if (!p) return null;
  const q = new URLSearchParams({
    Show: "Yes",
    CurMonth: p.month,
    CurYear: p.year,
    DataAction: "Apply",
    DrawDate: p.drawDate,
  });
  return `${BASE}?${q.toString()}`;
}

/** Fetch Sabah Lotto 6/45 from diriwan88.com for a draw date (YYYY-MM-DD). */
export async function fetchSabah645ForDate(
  dateIso: string
): Promise<Sabah645Official | null> {
  const url = resultUrl(dateIso);
  const drawDate = dateIsoToParams(dateIso)?.drawDate;
  if (!url || !drawDate) return null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[diriwan88] HTTP ${res.status} for ${dateIso}`);
      return null;
    }

    const html = await res.text();
    const parsed = parseLodBox(html);
    if (!parsed) return null;

    const draw_no = parseDrawNo(html, drawDate);
    return draw_no ? { ...parsed, draw_no } : parsed;
  } catch (e) {
    console.warn(
      `[diriwan88] fetch failed for ${dateIso}:`,
      e instanceof Error ? e.message : e
    );
    return null;
  }
}
