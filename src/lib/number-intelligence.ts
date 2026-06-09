import { createClient } from "@/lib/supabase/server";
import { calculateHeatScore } from "@/lib/heat-score";
import type { OperatorId } from "@/types";
import type {
  HeatLevel,
  HistoryGroup,
  NumberIntelMode,
  NumberIntelligenceResponse,
  NumberIntelligenceExtras,
  NumberStatsPayload,
  OperatorBreakdown,
  RecentAppearance,
  RelatedNumber,
  TimelinePoint,
} from "@/types/number-intelligence";

const PAGE_SIZE = 1000;

/** v2 operator column values used for breakdown grouping */
const V2_BREAKDOWN_OPERATORS = [
  "magnum",
  "damacai",
  "toto",
  "cashsweep",
  "singapore",
] as const;

type V2BreakdownOperator = (typeof V2_BREAKDOWN_OPERATORS)[number];

const V2_OPERATOR_LABELS: Record<V2BreakdownOperator, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Sports Toto",
  cashsweep: "Cash Sweep",
  singapore: "Singapore Pools",
};

/** Map draw_results_v2 / number_stats_v2 operator → OperatorId for API types */
const V2_TO_OPERATOR_ID: Record<string, OperatorId> = {
  magnum: "magnum",
  damacai: "damacai",
  toto: "toto",
  cashsweep: "sarawak",
  singapore: "sgpools",
  sabah88: "sabah",
  stc: "sandakan",
};

/** Map URL ?operators= values → draw_results_v2 / number_stats_v2 operator column */
const URL_TO_V2_OPERATOR: Record<string, string> = {
  magnum: "magnum",
  damacai: "damacai",
  toto: "toto",
  cashsweep: "cashsweep",
  sabah: "sabah88",
  sandakan: "stc",
  singapore: "singapore",
};

const HISTORY_FROM = "1985-01-01";

function computeGapStats(dates: string[]): {
  avg_gap_days: number | null;
  max_gap_days: number | null;
  min_gap_days: number | null;
  max_consecutive: number | null;
} {
  if (dates.length < 2) {
    return {
      avg_gap_days: null,
      max_gap_days: null,
      min_gap_days: null,
      max_consecutive: null,
    };
  }
  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round(
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) /
        86400000
    );
    gaps.push(diff);
  }
  const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  const max = Math.max(...gaps);
  const min = Math.min(...gaps);
  let maxConsec = 1;
  let curConsec = 1;
  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] <= 7) {
      curConsec++;
      maxConsec = Math.max(maxConsec, curConsec);
    } else curConsec = 1;
  }
  return {
    avg_gap_days: avg,
    max_gap_days: max,
    min_gap_days: min,
    max_consecutive: maxConsec,
  };
}

interface StatsV2Row {
  number: string;
  operator: string;
  total_appearances: number;
  first_prize_count: number;
  second_prize_count: number;
  third_prize_count: number;
  special_count: number;
  consolation_count: number;
  last_seen_date: string | null;
  last_prize_type: string | null;
}

interface DrawRowV2 {
  draw_date: string;
  draw_no: string | null;
  operator: string;
  first_prize: string | null;
  second_prize: string | null;
  third_prize: string | null;
  special_numbers: string[] | null;
  consolation_numbers: string[] | null;
}

interface AppearanceRow {
  date: string;
  operator: string;
  position: string;
  draw_no: string | null;
}

type SupabaseLike = NonNullable<ReturnType<typeof createClient>>;

function toOperatorId(v2Operator: string): OperatorId {
  return V2_TO_OPERATOR_ID[v2Operator] ?? (v2Operator as OperatorId);
}

function resolveV2Operators(operators?: string[]): string[] | undefined {
  if (!operators?.length) return undefined;
  const mapped = operators.map((op) => URL_TO_V2_OPERATOR[op] ?? op);
  return mapped.length > 0 ? mapped : undefined;
}

function drawMatchOrFilter(number: string): string {
  return [
    `first_prize.eq.${number}`,
    `second_prize.eq.${number}`,
    `third_prize.eq.${number}`,
    `special_numbers.cs.{${number}}`,
    `consolation_numbers.cs.{${number}}`,
  ].join(",");
}

export function isValid4D(number: string): boolean {
  return /^\d{4}$/.test(number);
}

export function normalize4D(input: string): string {
  return input.replace(/\D/g, "").padStart(4, "0").slice(-4);
}

export function parsePosition(position: string): {
  label: string;
  tier: RecentAppearance["position_tier"];
} {
  if (position === "first") return { label: "1st Prize", tier: "first" };
  if (position === "second") return { label: "2nd Prize", tier: "second" };
  if (position === "third") return { label: "3rd Prize", tier: "third" };
  if (position === "special" || position.startsWith("special")) {
    return { label: "Special", tier: "special" };
  }
  return { label: "Consolation", tier: "consolation" };
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.max(0, Math.round(Math.abs(db - da) / 86_400_000));
}

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split("T")[0];
}

function computeHeatLevel(
  totalHits: number,
  currentGap: number | null,
  avgGap: number | null
): HeatLevel {
  if (totalHits === 0) return "cold";
  const gap = currentGap ?? 0;
  const avg = avgGap ?? gap;
  if (avg > 0 && gap > avg * 1.25) return "cold";
  if (avg > 0 && gap <= avg * 0.6 && totalHits >= 2) return "hot";
  return "normal";
}

function positionForNumber(row: DrawRowV2, number: string): string | null {
  if (row.first_prize === number) return "first";
  if (row.second_prize === number) return "second";
  if (row.third_prize === number) return "third";
  if (row.special_numbers?.includes(number)) return "special";
  if (row.consolation_numbers?.includes(number)) return "consolation";
  return null;
}

function drawRowsToAppearances(
  rows: DrawRowV2[],
  number: string
): AppearanceRow[] {
  const out: AppearanceRow[] = [];
  for (const row of rows) {
    const position = positionForNumber(row, number);
    if (!position) continue;
    out.push({
      date: row.draw_date,
      operator: row.operator,
      position,
      draw_no: row.draw_no,
    });
  }
  return out;
}

function toRecentAppearance(row: AppearanceRow): RecentAppearance {
  const parsed = parsePosition(row.position);
  return {
    date: row.date,
    operator: toOperatorId(row.operator),
    position: row.position,
    position_label: parsed.label,
    position_tier: parsed.tier,
    draw_no: row.draw_no,
  };
}

function buildTimeline(rows: AppearanceRow[]): TimelinePoint[] {
  const now = new Date();
  const months: TimelinePoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: key, count: 0 });
  }
  const index = new Map(months.map((m) => [m.month, m]));
  for (const row of rows) {
    const d = new Date(row.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = index.get(key);
    if (bucket) bucket.count += 1;
  }
  return months;
}

function buildBreakdown(rows: AppearanceRow[]): OperatorBreakdown[] {
  const map = new Map<V2BreakdownOperator, OperatorBreakdown>();

  for (const v2Op of V2_BREAKDOWN_OPERATORS) {
    map.set(v2Op, {
      operator: toOperatorId(v2Op),
      label: V2_OPERATOR_LABELS[v2Op],
      total: 0,
      first: 0,
      second: 0,
      third: 0,
      special: 0,
      consolation: 0,
    });
  }

  for (const row of rows) {
    const v2Op = row.operator as V2BreakdownOperator;
    if (!map.has(v2Op)) continue;
    const entry = map.get(v2Op)!;
    entry.total += 1;
    if (row.position === "first") entry.first += 1;
    else if (row.position === "second") entry.second += 1;
    else if (row.position === "third") entry.third += 1;
    else if (row.position === "special" || row.position.startsWith("special")) {
      entry.special += 1;
    } else {
      entry.consolation += 1;
    }
  }

  return Array.from(map.values()).filter((b) => b.total > 0);
}

function computeStatsFromAppearances(
  number: string,
  appearances: AppearanceRow[]
): NumberStatsPayload {
  const sorted = [...appearances].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let first = 0;
  let second = 0;
  let third = 0;
  let special = 0;
  let consolation = 0;

  for (const row of appearances) {
    if (row.position === "first") first += 1;
    else if (row.position === "second") second += 1;
    else if (row.position === "third") third += 1;
    else if (row.position === "special" || row.position.startsWith("special")) {
      special += 1;
    } else {
      consolation += 1;
    }
  }

  const last = sorted[0];
  const today = new Date().toISOString().split("T")[0];
  const currentGap = last ? daysBetween(last.date, today) : null;
  const firstDate = sorted[sorted.length - 1]?.date;
  const daysSinceFirst = firstDate ? daysBetween(firstDate, today) || 1 : 1;
  const heatScore = calculateHeatScore(
    appearances.length,
    daysSinceFirst,
    currentGap ?? 0
  );

  return {
    number,
    total_hits: appearances.length,
    first_prize_hits: first,
    second_prize_hits: second,
    third_prize_hits: third,
    special_hits: special,
    consolation_hits: consolation,
    last_seen_date: last?.date ?? null,
    last_seen_operator: last?.operator ?? null,
    last_seen_position: last?.position ?? null,
    avg_gap_days: null,
    max_gap_days: null,
    min_gap_days: null,
    max_consecutive: null,
    current_gap_days: currentGap,
    heat_score: Math.round(heatScore * 1000) / 1000,
    heat_level: computeHeatLevel(appearances.length, currentGap, null),
  };
}

function aggregateStatsV2(
  number: string,
  rows: StatsV2Row[],
  earliestDrawDate: string | null
): NumberStatsPayload {
  let totalHits = 0;
  let firstPrize = 0;
  let secondPrize = 0;
  let thirdPrize = 0;
  let special = 0;
  let consolation = 0;
  let lastSeenDate: string | null = null;
  let lastSeenOperator: string | null = null;
  let lastSeenPosition: string | null = null;

  for (const row of rows) {
    totalHits += row.total_appearances ?? 0;
    firstPrize += row.first_prize_count ?? 0;
    secondPrize += row.second_prize_count ?? 0;
    thirdPrize += row.third_prize_count ?? 0;
    special += row.special_count ?? 0;
    consolation += row.consolation_count ?? 0;

    const d = row.last_seen_date;
    if (d && (!lastSeenDate || d > lastSeenDate)) {
      lastSeenDate = d;
      lastSeenOperator = row.operator;
      lastSeenPosition = row.last_prize_type;
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const currentGap = lastSeenDate ? daysBetween(lastSeenDate, today) : null;
  const daysSinceFirst = earliestDrawDate
    ? daysBetween(earliestDrawDate, today) || 1
    : lastSeenDate
      ? daysBetween(lastSeenDate, today) || 1
      : 1;
  const heatScore = calculateHeatScore(totalHits, daysSinceFirst, currentGap ?? 0);

  return {
    number,
    total_hits: totalHits,
    first_prize_hits: firstPrize,
    second_prize_hits: secondPrize,
    third_prize_hits: thirdPrize,
    special_hits: special,
    consolation_hits: consolation,
    last_seen_date: lastSeenDate,
    last_seen_operator: lastSeenOperator,
    last_seen_position: lastSeenPosition,
    avg_gap_days: null,
    max_gap_days: null,
    min_gap_days: null,
    max_consecutive: null,
    current_gap_days: currentGap,
    heat_score: Math.round(heatScore * 1000) / 1000,
    heat_level: computeHeatLevel(totalHits, currentGap, null),
  };
}

export function getReverseNumber(num: string): string {
  return num.split("").reverse().join("");
}

export function getAllPermutations(num: string): string[] {
  const digits = num.split("");
  const out = new Set<string>();

  function permute(arr: string[], prefix: string): void {
    if (out.size >= 24) return;
    if (arr.length === 0) {
      out.add(prefix);
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      permute(rest, prefix + arr[i]);
      if (out.size >= 24) return;
    }
  }

  permute(digits, "");
  const unique = Array.from(out);
  return [num, ...unique.filter((n) => n !== num)].slice(0, 24);
}

function resolveNumbersForMode(
  number: string,
  mode: NumberIntelMode
): string[] {
  if (mode === "reverse") {
    const rev = getReverseNumber(number);
    return rev === number ? [number] : [number, rev];
  }
  if (mode === "full") {
    return getAllPermutations(number);
  }
  return [number];
}

function permutationsOf(digits: string[]): string[] {
  if (digits.length <= 1) return [digits.join("")];
  const out = new Set<string>();
  for (let i = 0; i < digits.length; i++) {
    const rest = [...digits.slice(0, i), ...digits.slice(i + 1)];
    for (const p of permutationsOf(rest)) {
      out.add(digits[i] + p);
      if (out.size >= 12) break;
    }
  }
  return Array.from(out);
}

async function pageAllDrawMatches(
  supabase: SupabaseLike,
  number: string,
  since: string,
  v2Operators?: string[]
): Promise<DrawRowV2[]> {
  const out: DrawRowV2[] = [];
  let from = 0;

  for (;;) {
    let query = supabase
      .from("draw_results_v2")
      .select(
        "draw_date, draw_no, operator, first_prize, second_prize, third_prize, special_numbers, consolation_numbers"
      )
      .or(drawMatchOrFilter(number))
      .gte("draw_date", since);
    if (v2Operators?.length) {
      query = query.in("operator", v2Operators);
    }
    const { data, error } = await query
      .order("draw_date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    out.push(...(data as DrawRowV2[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return out;
}

async function getCachedDrawCount(
  supabase: SupabaseLike,
  since: string,
  v2Operators?: string[]
): Promise<number> {
  const opKey = v2Operators?.length
    ? v2Operators.slice().sort().join("-")
    : "all";
  const cacheKey = `draws_count_24mo_${opKey}`;
  const cacheTtlMs = 24 * 60 * 60 * 1000;

  const { data: cached } = await supabase
    .from("analytics_cache")
    .select("payload, updated_at")
    .eq("type", cacheKey)
    .maybeSingle();

  if (
    cached?.updated_at &&
    new Date(cached.updated_at as string).getTime() > Date.now() - cacheTtlMs
  ) {
    const payload = cached.payload;
    if (typeof payload === "number") return payload;
  }

  const count = await countRecentDraws(supabase, since, v2Operators);

  await supabase.from("analytics_cache").upsert(
    {
      type: cacheKey,
      payload: count,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "type" }
  );

  return count;
}

async function countRecentDraws(
  supabase: SupabaseLike,
  since: string,
  v2Operators?: string[]
): Promise<number> {
  const seen = new Set<string>();
  let from = 0;

  for (;;) {
    let query = supabase
      .from("draw_results_v2")
      .select("draw_date, operator")
      .gte("draw_date", since);
    if (v2Operators?.length) {
      query = query.in("operator", v2Operators);
    }
    const { data, error } = await query
      .order("draw_date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const row of data) {
      seen.add(`${row.draw_date as string}|${row.operator as string}`);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return seen.size;
}

async function buildRelatedNumbers(
  supabase: SupabaseLike,
  number: string,
  v2Operators?: string[]
): Promise<RelatedNumber[]> {
  const related: RelatedNumber[] = [];
  const last2 = number.slice(2);

  let sameTailQuery = supabase
    .from("number_stats_v2")
    .select("number, total_appearances")
    .like("number", `%${last2}`)
    .neq("number", number);
  if (v2Operators?.length) {
    sameTailQuery = sameTailQuery.in("operator", v2Operators);
  }
  const { data: sameTailRows, error: tailErr } = await sameTailQuery;

  if (tailErr) throw new Error(tailErr.message);

  const sameTailMap = new Map<string, number>();
  for (const row of sameTailRows ?? []) {
    const n = row.number as string;
    sameTailMap.set(
      n,
      (sameTailMap.get(n) ?? 0) + ((row.total_appearances as number) ?? 0)
    );
  }

  const sameTailSorted = Array.from(sameTailMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [n, total] of sameTailSorted) {
    related.push({ number: n, reason: "same_last2", total_hits: total });
  }

  const perms = permutationsOf(number.split(""))
    .filter((p) => p !== number && /^\d{4}$/.test(p))
    .slice(0, 6);

  if (perms.length > 0) {
    let permQuery = supabase
      .from("number_stats_v2")
      .select("number, total_appearances")
      .in("number", perms);
    if (v2Operators?.length) {
      permQuery = permQuery.in("operator", v2Operators);
    }
    const { data: permRows, error: permErr } = await permQuery;

    if (permErr) throw new Error(permErr.message);

    const permMap = new Map<string, number>();
    for (const row of permRows ?? []) {
      const n = row.number as string;
      permMap.set(
        n,
        (permMap.get(n) ?? 0) + ((row.total_appearances as number) ?? 0)
      );
    }

    const permSorted = Array.from(permMap.entries()).sort((a, b) => b[1] - a[1]);
    for (const [n, total] of permSorted) {
      related.push({ number: n, reason: "permutation", total_hits: total });
    }
  }

  const seen = new Set<string>();
  return related.filter((r) => {
    if (seen.has(r.number)) return false;
    seen.add(r.number);
    return true;
  });
}

async function buildExtras(
  supabase: SupabaseLike,
  number: string,
  stats: NumberStatsPayload,
  v2Operators?: string[]
): Promise<NumberIntelligenceExtras> {
  const since = monthsAgoIso(24);
  const totalDraws = await getCachedDrawCount(supabase, since, v2Operators);
  const winPct =
    totalDraws > 0
      ? Math.round((stats.total_hits / totalDraws) * 10000) / 100
      : 0;

  let predictedNext: string | null = null;
  if (stats.avg_gap_days != null && stats.last_seen_date) {
    const d = new Date(stats.last_seen_date);
    d.setDate(d.getDate() + Math.round(stats.avg_gap_days));
    predictedNext = d.toISOString().split("T")[0];
  }

  const related_numbers = await buildRelatedNumbers(
    supabase,
    number,
    v2Operators
  );

  return {
    total_draws_analyzed: totalDraws,
    win_probability_pct: winPct,
    predicted_next_date: predictedNext,
    related_numbers,
  };
}

function emptyResponse(number: string): NumberIntelligenceResponse {
  const stats: NumberStatsPayload = {
    number,
    total_hits: 0,
    first_prize_hits: 0,
    second_prize_hits: 0,
    third_prize_hits: 0,
    special_hits: 0,
    consolation_hits: 0,
    last_seen_date: null,
    last_seen_operator: null,
    last_seen_position: null,
    avg_gap_days: null,
    max_gap_days: null,
    min_gap_days: null,
    max_consecutive: null,
    current_gap_days: null,
    heat_score: null,
    heat_level: "cold",
  };
  return {
    number,
    stats,
    timeline: buildTimeline([]),
    breakdown: [],
    recent: [],
    history: {
      groups: [],
      page: 1,
      pageSize: 50,
      total: 0,
    },
    extras: {
      total_draws_analyzed: 0,
      win_probability_pct: 0,
      predicted_next_date: null,
      related_numbers: [],
    },
  };
}

export async function getNumberIntelligence(
  rawNumber: string,
  options?: {
    page?: number;
    pageSize?: number;
    operators?: string[];
    mode?: NumberIntelMode;
  }
): Promise<NumberIntelligenceResponse | null> {
  const number = normalize4D(rawNumber);
  if (!isValid4D(number)) return null;

  const page = Math.max(1, Math.floor(options?.page ?? 1));
  const pageSize = Math.max(1, Math.floor(options?.pageSize ?? 50));
  const mode = options?.mode ?? "single";
  const numbersToQuery = resolveNumbersForMode(number, mode);

  const supabase = createClient();
  if (!supabase) return emptyResponse(number);

  const since24mo = monthsAgoIso(24);
  const v2Operators = resolveV2Operators(options?.operators);

  let statsQuery = supabase
    .from("number_stats_v2")
    .select("*")
    .eq("number", number);
  if (v2Operators?.length) {
    statsQuery = statsQuery.in("operator", v2Operators);
  }

  const [statsResult, ...drawRowsByNumber] = await Promise.all([
    statsQuery,
    ...numbersToQuery.map((n) =>
      pageAllDrawMatches(supabase, n, HISTORY_FROM, v2Operators)
    ),
  ]);

  if (statsResult.error) throw new Error(statsResult.error.message);

  const primaryIdx = numbersToQuery.indexOf(number);
  const primaryDrawRows =
    drawRowsByNumber[primaryIdx >= 0 ? primaryIdx : 0] ?? [];
  const allAppearances = drawRowsToAppearances(primaryDrawRows, number);
  const earliestDrawDate =
    allAppearances.length > 0
      ? allAppearances.reduce(
          (min, row) => (row.date < min ? row.date : min),
          allAppearances[0].date
        )
      : null;

  const statsRows = (statsResult.data ?? []) as StatsV2Row[];
  const stats =
    statsRows.length > 0
      ? aggregateStatsV2(number, statsRows, earliestDrawDate)
      : computeStatsFromAppearances(number, allAppearances);

  const gapStats = computeGapStats(primaryDrawRows.map((r) => r.draw_date));
  stats.avg_gap_days = gapStats.avg_gap_days;
  stats.max_gap_days = gapStats.max_gap_days;
  stats.min_gap_days = gapStats.min_gap_days;
  stats.max_consecutive = gapStats.max_consecutive;

  const recent24mo = allAppearances.filter((row) => row.date >= since24mo);
  const recent = allAppearances.slice(0, 20).map(toRecentAppearance);

  const from = (page - 1) * pageSize;
  const historyGroups: HistoryGroup[] = numbersToQuery.map((n, i) => {
    const appearances = drawRowsToAppearances(drawRowsByNumber[i] ?? [], n);
    let items = appearances.map(toRecentAppearance);
    if (mode === "single") {
      items = items.slice(from, from + pageSize);
    }
    return { number: n, items };
  });

  const historyTotal = numbersToQuery.reduce((sum, n, i) => {
    return (
      sum + drawRowsToAppearances(drawRowsByNumber[i] ?? [], n).length
    );
  }, 0);

  const extras = await buildExtras(supabase, number, stats, v2Operators);

  return {
    number,
    stats,
    timeline: buildTimeline(recent24mo),
    breakdown: buildBreakdown(recent24mo),
    recent,
    history: {
      groups: historyGroups,
      page,
      pageSize,
      total: historyTotal,
    },
    extras,
  };
}
