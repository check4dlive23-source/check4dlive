/**
 * 全局内存缓存：所有 SSE 连接共享同一次抓取结果
 * 每个 region 每 3 秒最多抓一次 check4dresult.com
 */

import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";
import { scrapeLiveResults, upsertDrawResults } from "@/lib/live-results";
import type { Region } from "@/types";

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
      if (!isRegionLiveDraw(region)) return;
      const operators = await scrapeLiveResults(region);
      if (operators && Object.keys(operators).length > 0) {
        const today = todayMYT();
        await upsertDrawResults(operators, today, region);
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
