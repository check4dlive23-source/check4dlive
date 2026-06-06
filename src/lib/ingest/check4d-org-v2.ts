import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrawResultV2Row } from "@/lib/draw-results-v2";
import { upsertDrawResultsV2 } from "@/lib/draw-results-v2";
import { addDaysIso, isMytDrawDay, iterDates, sleep } from "@/lib/ingest/import-args";
import type { OperatorId } from "@/types";
import {
  fetchCheck4dOrgHtml,
  parseCheck4dOrg,
} from "@/scripts/bulk-import";

const SOURCE = "check4d.org";
const FALLBACK_SOURCE = "4dresult.asia";
const FOURDRESULT_ASIA_BASE = "https://4dresult.asia/en/history";
/** 4dresult.asia Singapore archive starts here; older dates rely on check4d.org only. */
const SINGAPORE_FALLBACK_FROM = "2023-01-04";

/** Map internal check4d.org operator id → draw_results_v2 operator name */
export const CHECK4D_V2_OPERATOR: Partial<Record<OperatorId, string>> = {
  magnum: "magnum",
  damacai: "damacai",
  toto: "toto",
  sgpools: "singapore",
  sarawak: "cashsweep",
  sabah: "sabah88",
  sandakan: "stc",
};

/** Magnum official JSON API reliable from this date (check4d.org before). */
export const MAGNUM_OFFICIAL_START = "2018-10-17";

/** Damacai blob API reliable from this date (check4d.org before). */
export const DAMACAI_OFFICIAL_START = "2005-01-01";

export function check4dSegmentEnd(
  from: string,
  to: string,
  officialStart: string
): { from: string; to: string } | null {
  if (from >= officialStart) return null;
  const segmentTo = to < officialStart ? to : addDaysIso(officialStart, -1);
  if (segmentTo < from) return null;
  return { from, to: segmentTo };
}

export function officialSegmentStart(
  from: string,
  to: string,
  officialStart: string
): { from: string; to: string } | null {
  if (to < officialStart) return null;
  const segmentFrom = from >= officialStart ? from : officialStart;
  if (segmentFrom > to) return null;
  return { from: segmentFrom, to };
}

export function parsedDrawToV2(
  draw: ReturnType<typeof parseCheck4dOrg>[number],
  operator: string
): DrawResultV2Row | null {
  if (!draw.first_prize || !/^\d{4}$/.test(draw.first_prize)) return null;
  return {
    draw_date: draw.date,
    draw_no: draw.draw_no ?? null,
    operator,
    first_prize: draw.first_prize,
    second_prize: draw.second_prize ?? null,
    third_prize: draw.third_prize ?? null,
    special_numbers: draw.special_numbers ?? [],
    consolation_numbers: draw.consolation_numbers ?? [],
    extra_data:
      draw.zodiac != null ? { zodiac: draw.zodiac } : null,
    source: SOURCE,
  };
}

/** Parse Singapore Pools from 4dresult.asia history page (fallback when check4d.org times out). */
export function parse4dresultAsiaSingapore(
  html: string,
  dateIso: string
): DrawResultV2Row | null {
  const blockM = html.match(
    /\{provider_code:"SG"[\s\S]*?prizes:\{top:\[[^\]]+\],special:\[[^\]]*\],consolation:\[[^\]]*\]\}\}/
  );
  if (!blockM) return null;

  const block = blockM[0];
  const drawNoM = block.match(/draw_number:"([^"]+)"/);
  const topM = block.match(/top:\[([^\]]+)\]/);
  const topNums = topM
    ? Array.from(topM[1].matchAll(/number:"(\d{4})"/g), (m) => m[1])
    : [];
  if (topNums.length < 3) return null;

  const specialM = block.match(/special:\[([^\]]*)\]/);
  const consolationM = block.match(/consolation:\[([^\]]*)\]/);
  const extractList = (raw?: string) =>
    raw
      ? Array.from(raw.matchAll(/"(\d{4})"/g), (m) => m[1])
      : [];

  return {
    draw_date: dateIso,
    draw_no: drawNoM?.[1] ?? null,
    operator: "singapore",
    first_prize: topNums[0],
    second_prize: topNums[1],
    third_prize: topNums[2],
    special_numbers: extractList(specialM?.[1]),
    consolation_numbers: extractList(consolationM?.[1]),
    extra_data: null,
    source: FALLBACK_SOURCE,
  };
}

/** Single quick attempt — used before 4dresult.asia fallback for Singapore. */
async function fetchCheck4dOrgHtmlQuick(dateIso: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.check4d.org/past-results/${dateIso}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept: "text/html",
          Referer: "https://www.check4d.org/",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      }
    );
    if (res.ok) return res.text();
  } catch {
    /* fall through */
  }
  return "";
}

async function fetch4dresultAsiaSingapore(
  dateIso: string
): Promise<DrawResultV2Row | null> {
  try {
    const res = await fetch(`${FOURDRESULT_ASIA_BASE}/${dateIso}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return parse4dresultAsiaSingapore(await res.text(), dateIso);
  } catch {
    return null;
  }
}

export async function fetchCheck4dOperatorDraw(
  dateIso: string,
  internalOperator: OperatorId
): Promise<DrawResultV2Row | null> {
  const v2Op = CHECK4D_V2_OPERATOR[internalOperator];
  if (!v2Op) return null;

  const html =
    internalOperator === "sgpools"
      ? await fetchCheck4dOrgHtmlQuick(dateIso)
      : await fetchCheck4dOrgHtml(dateIso);
  if (html) {
    const parsed = parseCheck4dOrg(html, dateIso);
    const draw = parsed.find((d) => d.operator === internalOperator);
    if (draw) return parsedDrawToV2(draw, v2Op);
  }

  if (internalOperator === "sgpools" && dateIso >= SINGAPORE_FALLBACK_FROM) {
    return fetch4dresultAsiaSingapore(dateIso);
  }

  return null;
}

export async function fetchCheck4dOperatorRange(
  internalOperator: OperatorId,
  from: string,
  to: string,
  opts?: { drawDaysOnly?: boolean; onProgress?: (msg: string) => void }
): Promise<{ rows: DrawResultV2Row[]; errors: string[] }> {
  const rows: DrawResultV2Row[] = [];
  const errors: string[] = [];
  let n = 0;

  for (const date of iterDates(from, to)) {
    if (opts?.drawDaysOnly && !isMytDrawDay(date)) continue;
    n++;
    try {
      const row = await fetchCheck4dOperatorDraw(date, internalOperator);
      if (row) rows.push(row);
    } catch (e) {
      errors.push(`${date}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (n % 50 === 0) opts?.onProgress?.(`${internalOperator} ${n} days scanned`);
  }

  return { rows, errors };
}

/** Day-by-day check4d.org import with upsert (Wed/Sat/Sun only). */
export async function importCheck4dOperatorHistory(
  supabase: SupabaseClient,
  internalOperator: OperatorId,
  from: string,
  to: string,
  delay = 250,
  label = internalOperator
): Promise<{ upserted: number; skip: number; errors: string[] }> {
  let upserted = 0;
  let skip = 0;
  const errors: string[] = [];
  let n = 0;

  console.log(`[${label}] check4d.org ${from} → ${to}`);

  for (const date of iterDates(from, to)) {
    if (!isMytDrawDay(date)) continue;
    n++;
    try {
      const row = await fetchCheck4dOperatorDraw(date, internalOperator);
      if (!row) {
        skip += 1;
      } else {
        const result = await upsertDrawResultsV2(supabase, [row]);
        upserted += result.upserted;
        errors.push(...result.errors);
      }
    } catch (e) {
      errors.push(`${date}: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (n % 25 === 0) {
      console.log(`[${label}] check4d ${n} draw days, upserted=${upserted}`);
    }
    if (delay > 0) await sleep(delay);
  }

  return { upserted, skip, errors };
}
