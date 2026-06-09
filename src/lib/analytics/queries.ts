import { readCache, writeCache } from "@/lib/analytics/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateHeatScore } from "@/lib/heat-score";
import {
  MOCK_COLD,
  MOCK_DIGIT,
  MOCK_HOT,
  MOCK_PATTERNS,
  isAnalyticsEmpty,
} from "@/lib/analytics/mock-data";
import type {
  ColdNumberRow,
  DigitAnalysis,
  HotNumberRow,
  PatternRow,
} from "@/types/analytics";
import type { HeatLevel } from "@/types/number-intelligence";

type SupabaseLike = NonNullable<ReturnType<typeof createClient>>;

export type AnalyticsFilter = {
  operators?: string[];
  since?: string;
  limit?: number;
};

const PAGE_SIZE = 1000;

const URL_TO_V2: Record<string, string> = {
  magnum: "magnum",
  damacai: "damacai",
  toto: "toto",
  cashsweep: "cashsweep",
  sabah: "sabah88",
  sandakan: "stc",
  singapore: "singapore",
};

function resolveV2Operators(operators?: string[]): string[] | undefined {
  if (!operators?.length) return undefined;
  const mapped = operators.map((op) => URL_TO_V2[op] ?? op);
  return mapped.length > 0 ? mapped : undefined;
}

function hasAnalyticsFilter(filter?: AnalyticsFilter): boolean {
  return Boolean(filter?.operators?.length || filter?.since);
}

export function parseAnalyticsFilter(
  searchParams: URLSearchParams
): AnalyticsFilter {
  const operatorsParam = searchParams.get("operators");
  const operators = operatorsParam
    ? operatorsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const since = searchParams.get("since") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

  return {
    operators: operators?.length ? operators : undefined,
    since: since || undefined,
    limit: limit != null && !Number.isNaN(limit) ? limit : undefined,
  };
}

function heatLevel(
  total: number,
  currentGap: number,
  avgGap: number | null
): HeatLevel {
  if (total === 0) return "cold";
  const avg = avgGap ?? currentGap;
  if (currentGap > avg * 1.25) return "cold";
  if (currentGap <= avg * 0.6 && total >= 2) return "hot";
  return "normal";
}

/**
 * Page through number_stats_v2 (default 1000/page) and return all matching
 * rows. Returns null on query error so callers can fall back to mock data.
 */
async function pageAllStatsV2(
  supabase: SupabaseLike,
  select: string,
  sinceDate?: string,
  operators?: string[]
): Promise<Record<string, unknown>[] | null> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  const v2Operators = resolveV2Operators(operators);

  for (;;) {
    let query = supabase
      .from("number_stats_v2")
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    if (sinceDate) query = query.gte("last_seen_date", sinceDate);
    if (v2Operators?.length) query = query.in("operator", v2Operators);

    const { data, error } = await query;
    if (error) return null;
    if (!data || data.length === 0) break;

    out.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return out;
}

async function historyCount(): Promise<number> {
  const supabase = createClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("number_stats_v2")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function computeHotNumbers(
  period: "30d" | "100draws",
  limit = 20,
  filter?: AnalyticsFilter
): Promise<{ rows: HotNumberRow[]; source: "db" | "mock" }> {
  const rowLimit = Math.max(1, Math.floor(filter?.limit ?? limit));
  const empty = isAnalyticsEmpty(await historyCount());
  if (empty) return { rows: MOCK_HOT.slice(0, rowLimit), source: "mock" };

  const supabase = createClient();
  if (!supabase) return { rows: MOCK_HOT.slice(0, rowLimit), source: "mock" };

  let sinceDate = filter?.since;
  if (!sinceDate && period === "30d") {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    sinceDate = since.toISOString().split("T")[0];
  }

  const data = await pageAllStatsV2(
    supabase,
    "number, total_appearances, first_prize_count, last_seen_date",
    sinceDate,
    filter?.operators
  );
  if (!data || !data.length) {
    return { rows: MOCK_HOT.slice(0, rowLimit), source: "mock" };
  }

  // number_stats_v2 is per (number, operator); collapse to one row per number.
  const map = new Map<string, { total: number; first: number; last: string }>();
  for (const row of data) {
    const n = row.number as string;
    const cur = map.get(n) ?? { total: 0, first: 0, last: "" };
    cur.total += (row.total_appearances as number) ?? 0;
    cur.first += (row.first_prize_count as number) ?? 0;
    const ls = (row.last_seen_date as string) ?? "";
    if (ls && (!cur.last || ls > cur.last)) cur.last = ls;
    map.set(n, cur);
  }

  const today = new Date().toISOString().split("T")[0];
  const rows: HotNumberRow[] = Array.from(map.entries())
    .map(([number, v]) => {
      const gap = v.last
        ? Math.max(
            0,
            Math.round(
              (new Date(today).getTime() - new Date(v.last).getTime()) /
                86_400_000
            )
          )
        : 999;
      const heat = calculateHeatScore(v.total, 30, gap);
      return {
        number,
        total_hits: v.total,
        first_hits: v.first,
        last_seen: v.last || null,
        heat_score: Math.round(heat * 1000) / 1000,
        heat_level: heatLevel(v.total, gap, 30),
      };
    })
    .sort((a, b) => b.total_hits - a.total_hits)
    .slice(0, rowLimit);

  return {
    rows: rows.length ? rows : MOCK_HOT.slice(0, rowLimit),
    source: "db",
  };
}

export async function getHotNumbers(
  period: "30d" | "100draws",
  filter?: AnalyticsFilter
): Promise<{ rows: HotNumberRow[]; source: "db" | "mock" }> {
  const rowLimit = Math.max(1, Math.floor(filter?.limit ?? 20));

  if (!hasAnalyticsFilter(filter)) {
    const cacheKey = period === "30d" ? "hot_30d" : "hot_100draws";
    const cached = await readCache(cacheKey);
    if (Array.isArray(cached)) {
      return { rows: (cached as HotNumberRow[]).slice(0, rowLimit), source: "db" };
    }
  }

  const result = await computeHotNumbers(period, rowLimit, filter);
  if (result.source === "db" && !hasAnalyticsFilter(filter)) {
    const cacheKey = period === "30d" ? "hot_30d" : "hot_100draws";
    await writeCache(cacheKey, result.rows);
  }
  return result;
}

export async function computeColdNumbers(
  minGap: number,
  limit = 20,
  filter?: AnalyticsFilter
): Promise<{ rows: ColdNumberRow[]; source: "db" | "mock" }> {
  const rowLimit = Math.max(1, Math.floor(filter?.limit ?? limit));
  const empty = isAnalyticsEmpty(await historyCount());
  if (empty) return { rows: MOCK_COLD.slice(0, rowLimit), source: "mock" };

  const supabase = createClient();
  if (!supabase) return { rows: MOCK_COLD.slice(0, rowLimit), source: "mock" };

  const data = await pageAllStatsV2(
    supabase,
    "number, total_appearances, last_seen_date",
    filter?.since,
    filter?.operators
  );
  if (!data || !data.length) {
    return { rows: MOCK_COLD.slice(0, rowLimit), source: "mock" };
  }

  // Collapse to one row per number: most-recent sighting across any operator.
  const map = new Map<string, { total: number; last: string | null }>();
  for (const row of data) {
    const n = row.number as string;
    const cur = map.get(n) ?? { total: 0, last: null };
    cur.total += (row.total_appearances as number) ?? 0;
    const ls = (row.last_seen_date as string) ?? null;
    if (ls && (!cur.last || ls > cur.last)) cur.last = ls;
    map.set(n, cur);
  }

  const now = Date.now();
  const rows: ColdNumberRow[] = Array.from(map.entries())
    .map(([number, v]) => {
      const gap = v.last
        ? Math.floor((now - new Date(v.last).getTime()) / 86_400_000)
        : Number.MAX_SAFE_INTEGER;
      return {
        number,
        last_seen_date: v.last,
        gap_days: gap,
        total_hits: v.total,
      };
    })
    .filter((r) => r.gap_days >= minGap)
    // last_seen_date ASC == longest gap first (coldest at top).
    .sort((a, b) => b.gap_days - a.gap_days)
    .slice(0, rowLimit);

  return {
    rows: rows.length ? rows : MOCK_COLD.slice(0, rowLimit),
    source: "db",
  };
}

export async function getTopHotNumbers(limit = 100): Promise<HotNumberRow[]> {
  const { rows } = await getHotNumbers("100draws", { limit });
  return rows.slice(0, limit);
}

export async function getTopColdNumbers(limit = 100): Promise<ColdNumberRow[]> {
  const CACHE_KEY = "cold_top100";
  const cacheTtlMs = 3600 * 1000;
  const supabase = createClient();
  if (supabase) {
    const { data: cached } = await supabase
      .from("analytics_cache")
      .select("payload, updated_at")
      .eq("type", CACHE_KEY)
      .maybeSingle();
    if (
      cached?.updated_at &&
      new Date(cached.updated_at as string).getTime() > Date.now() - cacheTtlMs
    ) {
      const p = cached.payload;
      if (Array.isArray(p) && p.length > 0) return p as ColdNumberRow[];
    }
  }
  const { rows } = await computeColdNumbers(0, limit);
  if (supabase && rows.length) {
    await supabase.from("analytics_cache").upsert(
      { type: CACHE_KEY, payload: rows, updated_at: new Date().toISOString() },
      { onConflict: "type" }
    );
  }
  return rows;
}

export async function getTopFirstPrizeNumbers(
  limit = 100
): Promise<HotNumberRow[]> {
  const CACHE_KEY = "first_prize_top100";
  const cacheTtlMs = 3600 * 1000;
  const supabaseForCache = createClient();
  if (supabaseForCache) {
    const { data: cached } = await supabaseForCache
      .from("analytics_cache")
      .select("payload, updated_at")
      .eq("type", CACHE_KEY)
      .maybeSingle();
    if (
      cached?.updated_at &&
      new Date(cached.updated_at as string).getTime() > Date.now() - cacheTtlMs
    ) {
      const p = cached.payload;
      if (Array.isArray(p) && p.length > 0) return p as HotNumberRow[];
    }
  }

  const empty = isAnalyticsEmpty(await historyCount());
  if (empty) {
    return [...MOCK_HOT]
      .sort((a, b) => b.first_hits - a.first_hits)
      .slice(0, limit);
  }

  const supabase = createClient();
  if (!supabase) {
    return [...MOCK_HOT]
      .sort((a, b) => b.first_hits - a.first_hits)
      .slice(0, limit);
  }

  const data = await pageAllStatsV2(
    supabase,
    "number, total_appearances, first_prize_count, last_seen_date"
  );
  if (!data || !data.length) {
    return [...MOCK_HOT]
      .sort((a, b) => b.first_hits - a.first_hits)
      .slice(0, limit);
  }

  const map = new Map<string, { total: number; first: number; last: string }>();
  for (const row of data) {
    const n = row.number as string;
    const cur = map.get(n) ?? { total: 0, first: 0, last: "" };
    cur.total += (row.total_appearances as number) ?? 0;
    cur.first += (row.first_prize_count as number) ?? 0;
    const ls = (row.last_seen_date as string) ?? "";
    if (ls && (!cur.last || ls > cur.last)) cur.last = ls;
    map.set(n, cur);
  }

  const today = new Date().toISOString().split("T")[0];
  const rows: HotNumberRow[] = Array.from(map.entries())
    .map(([number, v]) => {
      const gap = v.last
        ? Math.max(
            0,
            Math.round(
              (new Date(today).getTime() - new Date(v.last).getTime()) /
                86_400_000
            )
          )
        : 999;
      const heat = calculateHeatScore(v.total, 30, gap);
      return {
        number,
        total_hits: v.total,
        first_hits: v.first,
        last_seen: v.last || null,
        heat_score: Math.round(heat * 1000) / 1000,
        heat_level: heatLevel(v.total, gap, 30),
      };
    })
    .sort((a, b) => b.first_hits - a.first_hits)
    .slice(0, limit);

  if (supabaseForCache && rows.length) {
    await supabaseForCache.from("analytics_cache").upsert(
      { type: CACHE_KEY, payload: rows, updated_at: new Date().toISOString() },
      { onConflict: "type" }
    );
  }

  return rows.length
    ? rows
    : [...MOCK_HOT]
        .sort((a, b) => b.first_hits - a.first_hits)
        .slice(0, limit);
}

export async function getColdNumbers(
  minGap: number,
  filter?: AnalyticsFilter
): Promise<{ rows: ColdNumberRow[]; source: "db" | "mock" }> {
  const rowLimit = Math.max(1, Math.floor(filter?.limit ?? 20));

  if (minGap === 30 && !hasAnalyticsFilter(filter)) {
    const cached = await readCache("cold_30");
    if (Array.isArray(cached)) {
      return {
        rows: (cached as ColdNumberRow[]).slice(0, rowLimit),
        source: "db",
      };
    }
  }

  const result = await computeColdNumbers(minGap, rowLimit, filter);
  if (minGap === 30 && result.source === "db" && !hasAnalyticsFilter(filter)) {
    await writeCache("cold_30", result.rows);
  }
  return result;
}

function emptyDigitGrid(): DigitAnalysis["thousands"] {
  return Array.from({ length: 10 }, (_, d) => ({ digit: d, count: 0 }));
}

function buildDigitAnalysis(
  entries: { num: string; weight: number }[]
): DigitAnalysis {
  const grids = [
    emptyDigitGrid(),
    emptyDigitGrid(),
    emptyDigitGrid(),
    emptyDigitGrid(),
  ];
  for (const { num, weight } of entries) {
    if (!/^\d{4}$/.test(num)) continue;
    for (let i = 0; i < 4; i++) {
      const d = parseInt(num[i], 10);
      grids[i][d].count += weight;
    }
  }
  return {
    thousands: grids[0],
    hundreds: grids[1],
    tens: grids[2],
    units: grids[3],
  };
}

function isDigitAnalysis(cached: unknown): cached is DigitAnalysis {
  return (
    typeof cached === "object" &&
    cached !== null &&
    "thousands" in cached &&
    "hundreds" in cached &&
    "tens" in cached &&
    "units" in cached
  );
}

export async function computeDigitAnalysis(
  filter?: AnalyticsFilter
): Promise<{
  data: DigitAnalysis;
  source: "db" | "mock";
}> {
  const empty = isAnalyticsEmpty(await historyCount());
  if (empty) return { data: MOCK_DIGIT, source: "mock" };

  const supabase = createClient();
  if (!supabase) return { data: MOCK_DIGIT, source: "mock" };

  const data = await pageAllStatsV2(
    supabase,
    "number, total_appearances",
    filter?.since,
    filter?.operators
  );
  if (!data || !data.length) {
    return { data: MOCK_DIGIT, source: "mock" };
  }

  // Weight each number's digit contribution by its total appearances.
  const entries = data.map((r) => ({
    num: r.number as string,
    weight: (r.total_appearances as number) ?? 0,
  }));
  return { data: buildDigitAnalysis(entries), source: "db" };
}

export async function getDigitAnalysis(
  filter?: AnalyticsFilter
): Promise<{
  data: DigitAnalysis;
  source: "db" | "mock";
}> {
  if (!hasAnalyticsFilter(filter)) {
    const cached = await readCache("digit");
    if (isDigitAnalysis(cached)) {
      return { data: cached, source: "db" };
    }
  }

  const result = await computeDigitAnalysis(filter);
  if (result.source === "db" && !hasAnalyticsFilter(filter)) {
    await writeCache("digit", result.data);
  }
  return result;
}

const TWIN_EXAMPLES = ["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"];
const SEQ_EXAMPLES = ["0123", "1234", "2345", "3456", "4567", "5678", "6789", "7890"];
const PAIR_EXAMPLES = ["0011", "1122", "2233", "3344", "4455", "5566", "6677", "7788", "8899", "9900"];

function isTwin(n: string): boolean {
  return /^(\d)\1{3}$/.test(n);
}
function isSequential(n: string): boolean {
  const d = n.split("").map(Number);
  for (let i = 1; i < 4; i++) {
    if ((d[i - 1] + 1) % 10 !== d[i]) return false;
  }
  return true;
}
function isRepeatingPair(n: string): boolean {
  return /^(\d)\1(\d)\2$/.test(n) && n[0] !== n[2];
}

export async function computePatterns(
  filter?: AnalyticsFilter
): Promise<{
  rows: PatternRow[];
  source: "db" | "mock";
}> {
  const empty = isAnalyticsEmpty(await historyCount());
  if (empty) return { rows: MOCK_PATTERNS, source: "mock" };

  const supabase = createClient();
  if (!supabase) return { rows: MOCK_PATTERNS, source: "mock" };

  const data = await pageAllStatsV2(
    supabase,
    "number, total_appearances",
    filter?.since,
    filter?.operators
  );
  if (!data || !data.length) {
    return { rows: MOCK_PATTERNS, source: "mock" };
  }

  // Weighted hit counts: sum total_appearances per number across operators.
  const counts = new Map<string, number>();
  for (const row of data) {
    const n = row.number as string;
    counts.set(n, (counts.get(n) ?? 0) + ((row.total_appearances as number) ?? 0));
  }

  const rows: PatternRow[] = [];

  for (const ex of TWIN_EXAMPLES) {
    rows.push({
      pattern: "Twin (AAAA)",
      example: ex,
      hit_count: counts.get(ex) ?? 0,
    });
  }
  for (const ex of SEQ_EXAMPLES) {
    rows.push({
      pattern: "Sequential",
      example: ex,
      hit_count: counts.get(ex) ?? 0,
    });
  }
  for (const ex of PAIR_EXAMPLES) {
    rows.push({
      pattern: "Repeating pair (AABB)",
      example: ex,
      hit_count: counts.get(ex) ?? 0,
    });
  }

  // Include any matching numbers from DB not in preset list
  for (const [num, c] of Array.from(counts.entries())) {
    if (isTwin(num) && !TWIN_EXAMPLES.includes(num)) {
      rows.push({ pattern: "Twin (AAAA)", example: num, hit_count: c });
    } else if (isSequential(num) && !SEQ_EXAMPLES.includes(num)) {
      rows.push({ pattern: "Sequential", example: num, hit_count: c });
    } else if (isRepeatingPair(num) && !PAIR_EXAMPLES.includes(num)) {
      rows.push({ pattern: "Repeating pair (AABB)", example: num, hit_count: c });
    }
  }

  return {
    rows: rows.length ? rows : MOCK_PATTERNS,
    source: "db",
  };
}

export async function getPatterns(
  filter?: AnalyticsFilter
): Promise<{
  rows: PatternRow[];
  source: "db" | "mock";
}> {
  if (!hasAnalyticsFilter(filter)) {
    const cached = await readCache("patterns");
    if (Array.isArray(cached)) {
      return { rows: cached as PatternRow[], source: "db" };
    }
  }

  const result = await computePatterns(filter);
  if (result.source === "db" && !hasAnalyticsFilter(filter)) {
    await writeCache("patterns", result.rows);
  }
  return result;
}

export async function getWeeklyHotNumbers(
  limit = 8
): Promise<{ rows: HotNumberRow[]; source: "db" | "mock" }> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceDate = since.toISOString().split("T")[0];
  return computeHotNumbers("30d", limit, { since: sinceDate, limit });
}

export async function getWeeklyHotNumbersLastWeek(
  limit = 10
): Promise<{ rows: HotNumberRow[]; source: "db" | "mock" }> {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceDate = since.toISOString().split("T")[0];
  return computeHotNumbers("30d", limit, { since: sinceDate, limit });
}

export async function getRisingNumbers(
  limit = 8
): Promise<{ rows: HotNumberRow[]; source: "db" | "mock" }> {
  const supabase = createClient();
  if (!supabase) return { rows: MOCK_HOT.slice(0, limit), source: "mock" };

  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);
  const sinceDate7d = since7d.toISOString().split("T")[0];

  const since90d = new Date();
  since90d.setDate(since90d.getDate() - 90);
  const sinceDate90d = since90d.toISOString().split("T")[0];

  // 近7天出现的号码
  const recent7d = await pageAllStatsV2(
    supabase,
    "number, total_appearances, last_seen_date",
    sinceDate7d
  );

  // 近90天出现的号码（作为分母）
  const recent90d = await pageAllStatsV2(
    supabase,
    "number, total_appearances, last_seen_date",
    sinceDate90d
  );

  if (!recent7d?.length || !recent90d?.length) {
    return { rows: MOCK_HOT.slice(0, limit), source: "mock" };
  }

  // 按 number 聚合7天数据
  const map7d = new Map<string, number>();
  for (const row of recent7d) {
    const n = row.number as string;
    map7d.set(n, (map7d.get(n) ?? 0) + ((row.total_appearances as number) ?? 0));
  }

  // 按 number 聚合90天数据
  const map90d = new Map<string, { total: number; last: string }>();
  for (const row of recent90d) {
    const n = row.number as string;
    const cur = map90d.get(n) ?? { total: 0, last: "" };
    cur.total += (row.total_appearances as number) ?? 0;
    const ls = (row.last_seen_date as string) ?? "";
    if (ls && (!cur.last || ls > cur.last)) cur.last = ls;
    map90d.set(n, cur);
  }

  // 黑马：近7天有出现，且 7天占比 > 40%（近期突然活跃）
  const rising: HotNumberRow[] = [];
  for (const entry of Array.from(map7d.entries())) {
    const number = entry[0];
    const hits7d = entry[1];
    const data90d = map90d.get(number);
    if (!data90d) continue;
    const ratio = hits7d / data90d.total; // 近7天占90天总出现比例
    if (ratio >= 0.3 && data90d.total <= 10) {
      // 比例高且总次数不多（历史不热门）
      rising.push({
        number,
        total_hits: data90d.total,
        first_hits: 0,
        last_seen: data90d.last || null,
        heat_score: ratio,
        heat_level: "hot",
      });
    }
  }

  // 按 ratio（heat_score）降序排列
  rising.sort((a, b) => (b.heat_score ?? 0) - (a.heat_score ?? 0));

  const rows = rising.slice(0, limit);
  return {
    rows: rows.length ? rows : MOCK_HOT.slice(0, limit),
    source: rows.length ? "db" : "mock",
  };
}
