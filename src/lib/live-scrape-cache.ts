/**
 * 全局内存缓存：所有 SSE 连接共享同一次抓取结果
 * 每个 region 每 3 秒最多抓一次 check4dresult.com
 */

import { fetchAllCheck4dDraws } from "@/lib/ingest/parse-check4d";
import { supplementMagnumFromOfficial } from "@/lib/ingest/magnum-supplement";
import { todayMYT } from "@/lib/draw-time";
import { scrapeLiveResults, upsertDrawResults } from "@/lib/live-results";
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

interface CacheEntry {
  lastFetchedAt: number;
  promise: Promise<void> | null;
}

const cache = new Map<Region, CacheEntry>();
const CACHE_TTL = 3_000;

export async function scrapeAndCacheRegion(region: Region): Promise<void> {
  const now = Date.now();
  const entry = cache.get(region);

  if (entry && now - entry.lastFetchedAt < CACHE_TTL) {
    if (entry.promise) await entry.promise;
    return;
  }

  const fetchPromise = (async () => {
    try {
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
