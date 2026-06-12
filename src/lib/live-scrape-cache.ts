/**
 * 全局内存缓存：所有 SSE 连接共享同一次抓取结果
 * 每个 region 每 3 秒最多抓一次 check4dresult.com
 */

import { fetchAllCheck4dDraws } from "@/lib/ingest/parse-check4d";
import { magnumNeedsOfficialSupplement, supplementMagnumFromOfficial } from "@/lib/ingest/magnum-supplement";
import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";
import type { DrawRow } from "@/lib/live-results";
import { isRealNum } from "@/lib/results-mapper";
import { createClient } from "@/lib/supabase/server";
import { upsertDrawResultsV2 } from "@/lib/draw-results-v2";
import type { DrawResultV2Row } from "@/lib/draw-results-v2";
import type { Region } from "@/types";

const SCRAPE_TO_V2_OPERATOR: Record<string, string> = {
  magnum: "magnum",
  damacai: "damacai",
  toto: "toto",
  sgpools: "singapore",
  sarawak: "cashsweep",
  sabah: "sabah88",
  sandakan: "stc",
};

const REGION_OPERATORS: Record<Region, string[]> = {
  west: ["magnum", "damacai", "toto"],
  east: ["sabah", "sarawak", "sandakan"],
  singapore: ["sgpools"],
};

/** Outside live window: at most one deficient-heal scrape per region per 10 minutes */
const deficientScrapeAt = new Map<Region, number>();
const DEFICIENT_SCRAPE_TTL = 10 * 60 * 1000;

interface CacheEntry {
  lastFetchedAt: number;
  promise: Promise<void> | null;
}

const cache = new Map<Region, CacheEntry>();
const CACHE_TTL = 3_000;

function isTodayRowIncomplete(row: DrawRow, today: string): boolean {
  if ((row.date as string) !== today) return false;
  const first = row.first_prize as string | null | undefined;
  if (!first || first === "----") return true;
  const second = row.second_prize as string | null | undefined;
  const third = row.third_prize as string | null | undefined;
  if (!isRealNum(second) || !isRealNum(third)) return true;
  return false;
}

function strField(v: unknown): string {
  return String(v ?? "").trim();
}

function hasValidDamacai3Plus3D(row: DrawRow): boolean {
  const extra = row.extra_data as Record<string, unknown> | undefined;
  if (!extra) return false;
  const raw = extra.damacai3Plus3D;
  if (!raw || typeof raw !== "object") return false;
  const d = raw as Record<string, unknown>;
  const ok = (s: string) => s !== "" && s !== "----";
  return (
    ok(strField(d.first)) ||
    ok(strField(d.second)) ||
    ok(strField(d.third))
  );
}

function hasValidSabahExtras(row: DrawRow): boolean {
  const extra = row.extra_data as Record<string, unknown> | undefined;
  if (!extra) return false;

  const d3 = extra.sabah3D;
  if (d3 && typeof d3 === "object") {
    const d = d3 as Record<string, unknown>;
    const ok = (s: string) => s !== "" && s !== "----";
    if (
      ok(strField(d.first)) ||
      ok(strField(d.second)) ||
      ok(strField(d.third))
    ) {
      return true;
    }
  }

  const lotto = extra.sabahLotto;
  if (lotto && typeof lotto === "object") {
    const l = lotto as Record<string, unknown>;
    for (const game of ["lotto5", "lotto6"] as const) {
      const tiers = l[game];
      if (Array.isArray(tiers) && tiers.length > 0) return true;
    }
  }

  return false;
}

/** Star/Power/Supreme lotto only — 5D/6D omitted (source omits them off draw days). */
function hasValidTotoLotto(row: DrawRow): boolean {
  const extra = row.extra_data as Record<string, unknown> | undefined;
  if (!extra) return false;
  const lotto = extra.totoLotto;
  if (!lotto || typeof lotto !== "object") return false;
  const l = lotto as Record<string, unknown>;
  const ok = (s: string) => s !== "" && s !== "----";

  for (const key of ["star", "power", "supreme"] as const) {
    const section = l[key];
    if (!section || typeof section !== "object") continue;
    const s = section as Record<string, unknown>;
    const balls = Array.isArray(s.balls) ? s.balls : [];
    if (balls.some((b) => ok(strField(b)))) return true;
    if (ok(strField(s.bonus))) return true;
    for (const jk of ["jackpot1", "jackpot2", "jackpot"] as const) {
      if (ok(strField(s[jk]))) return true;
    }
  }
  return false;
}

export function isLatestRowDeficient(
  region: Region,
  operators: Record<string, DrawRow>
): boolean {
  for (const op of REGION_OPERATORS[region] ?? []) {
    const row = operators[op];
    if (!row) continue;
    if (!isRealNum(row.first_prize as string)) return true;
    if (op === "magnum" && magnumNeedsOfficialSupplement(row)) return true;
    if (op === "damacai" && !hasValidDamacai3Plus3D(row)) return true;
    // (d) east sabah — operator key matches DB/check4d: "sabah"
    if (op === "sabah" && !hasValidSabahExtras(row)) return true;
    // (e) toto lotto only; 5D/6D empty off draw days is normal — do not trigger heal
    if (op === "toto" && !hasValidTotoLotto(row)) return true;
  }
  return false;
}

function isDeficientScrapeAllowed(region: Region): boolean {
  const last = deficientScrapeAt.get(region) ?? 0;
  return Date.now() - last >= DEFICIENT_SCRAPE_TTL;
}

function markDeficientScrape(region: Region): void {
  deficientScrapeAt.set(region, Date.now());
}

/** Scrape in live window, when today's rows are incomplete, or latest rows need heal. */
export function shouldScrapeRegion(
  region: Region,
  operators: Record<string, DrawRow>,
  today: string,
  mockLive = false
): boolean {
  if (isRegionLiveDraw(region, new Date(), mockLive)) return true;

  for (const op of REGION_OPERATORS[region] ?? []) {
    const row = operators[op];
    if (row && isTodayRowIncomplete(row, today)) return true;
  }

  if (isLatestRowDeficient(region, operators)) {
    if (isDeficientScrapeAllowed(region)) {
      markDeficientScrape(region);
      return true;
    }
    return false;
  }

  return false;
}

export async function scrapeAndCacheRegion(region: Region): Promise<void> {
  const now = Date.now();
  const entry = cache.get(region);

  if (entry && now - entry.lastFetchedAt < CACHE_TTL) {
    if (entry.promise) await entry.promise;
    return;
  }

  const fetchPromise = (async () => {
    try {
      const { scrapeLiveResults, upsertDrawResults } = await import(
        "@/lib/live-results"
      );
      const parsed = await fetchAllCheck4dDraws(region);
      let operators = await scrapeLiveResults(region, parsed);

      if (region === "west" && operators.magnum) {
        try {
          operators = await supplementMagnumFromOfficial(operators);
        } catch (e) {
          console.warn(
            "[live-scrape-cache] magnum official supplement failed:",
            e instanceof Error ? e.message : e
          );
        }
      }

      if (operators && Object.keys(operators).length > 0) {
        const today = todayMYT();
        await upsertDrawResults(operators, today, region);

        // 同步写入 draw_results_v2
        const supabase = createClient();
        if (supabase && Object.keys(operators).length > 0) {
          const v2Rows = Object.entries(operators)
            .map(([op, row]) => {
              const v2Op = SCRAPE_TO_V2_OPERATOR[op] ?? op;
              const first = row.first_prize as string | null;
              if (!first || !/^\d{4}$/.test(first)) return null;
              return {
                draw_date: (row.date as string) ?? today,
                draw_no: (row.draw_no as string | null | undefined) ?? null,
                operator: v2Op,
                first_prize: first,
                second_prize: (row.second_prize as string) ?? null,
                third_prize: (row.third_prize as string) ?? null,
                special_numbers: (row.special_numbers as string[]) ?? null,
                consolation_numbers: (row.consolation_numbers as string[]) ?? null,
                extra_data: (row.extra_data as Record<string, unknown>) ?? null,
                source: "scrape",
              } satisfies DrawResultV2Row;
            })
            .filter((r) => r !== null) as DrawResultV2Row[];
          if (v2Rows.length > 0) {
            await upsertDrawResultsV2(supabase, v2Rows);
          }
        }
      }
    } catch (e) {
      console.warn(`[live-scrape-cache] scrape failed for ${region}:`, e);
    }
  })();

  cache.set(region, {
    lastFetchedAt: now,
    promise: fetchPromise,
  });

  await fetchPromise;

  const current = cache.get(region);
  if (current) current.promise = null;
}
