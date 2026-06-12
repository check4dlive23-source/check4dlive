import { mirrorOf } from "@/lib/score/compute";
import { V2_OPERATORS } from "@/lib/score/config";
import { getNumberScore } from "@/lib/score/queries";
import { createClient } from "@/lib/supabase/server";
import type { NumberScoreRow } from "@/lib/score/compute";

const PAGE = 1000;
const HEATMAP_YEARS = 42;
const MIRROR_MONTHS = 24;
const PRE_HIT_WINDOW = 30;
const PRE_HIT_MAX_SAMPLES = 20;
const COLD_SCAN_LIMIT = 800;

export interface YearHeatCell {
  year: number;
  hits: number;
}

export interface OperatorBreakdownRow {
  operator: string;
  hits: number;
  avgGapDraws: number | null;
  lastSeen: string | null;
  gapRatio: number | null;
}

export interface ColdPeer {
  number: string;
  gapRatio: number;
  isSelf?: boolean;
}

export interface MirrorMonthRow {
  month: string;
  self: number;
  mirror: number;
}

export interface PreHitPattern {
  windowDays: number;
  preHitTailMean: number;
  baselineTailMean: number;
  sampleHits: number;
}

export interface ScoreTrendPoint {
  date: string;
  score: number;
}

export interface NumberReportData {
  number: string;
  mirrorNumber: string;
  yearHeatmap: YearHeatCell[];
  operatorBreakdown: OperatorBreakdownRow[];
  coldCohort: {
    rank: number;
    total: number;
    peers: ColdPeer[];
  };
  mirrorTimeline: MirrorMonthRow[];
  preHitPattern: PreHitPattern;
  scoreTrend: ScoreTrendPoint[];
  score: NumberScoreRow | null;
}

interface DrawRow {
  draw_date: string;
  operator: string;
  first_prize: string | null;
  second_prize: string | null;
  third_prize: string | null;
  special_numbers: string[] | null;
  consolation_numbers: string[] | null;
}

function drawMatchOr(number: string): string {
  return [
    `first_prize.eq.${number}`,
    `second_prize.eq.${number}`,
    `third_prize.eq.${number}`,
    `special_numbers.cs.{${number}}`,
    `consolation_numbers.cs.{${number}}`,
  ].join(",");
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function monthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function numbersFromDraw(row: DrawRow): string[] {
  const out: string[] = [];
  for (const n of [row.first_prize, row.second_prize, row.third_prize]) {
    if (n && /^\d{4}$/.test(n)) out.push(n);
  }
  for (const list of [row.special_numbers, row.consolation_numbers]) {
    if (!Array.isArray(list)) continue;
    for (const n of list) {
      if (n && /^\d{4}$/.test(n)) out.push(n);
    }
  }
  return out;
}

function tailDigit(n: string): number {
  return parseInt(n[3], 10);
}

/** Paginated draw matches for one number (~hits rows, typically <500). */
async function fetchNumberDraws(
  number: string,
  since: string
): Promise<DrawRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const out: DrawRow[] = [];
  let page = 0;

  while (page < 20) {
    const { data, error } = await supabase
      .from("draw_results_v2")
      .select(
        "draw_date, operator, first_prize, second_prize, third_prize, special_numbers, consolation_numbers"
      )
      .or(drawMatchOr(number))
      .gte("draw_date", since)
      .order("draw_date", { ascending: true })
      .range(page * PAGE, (page + 1) * PAGE - 1);

    if (error || !data?.length) break;
    out.push(...(data as DrawRow[]));
    if (data.length < PAGE) break;
    page++;
  }
  return out;
}

/** Windowed draw fetch for pre-hit tail density (~≤20k rows cap). */
async function fetchDrawsInRange(
  since: string,
  until: string
): Promise<DrawRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const out: DrawRow[] = [];
  let page = 0;

  while (page < 25) {
    const { data, error } = await supabase
      .from("draw_results_v2")
      .select(
        "draw_date, first_prize, second_prize, third_prize, special_numbers, consolation_numbers"
      )
      .gte("draw_date", since)
      .lte("draw_date", until)
      .order("draw_date", { ascending: true })
      .range(page * PAGE, (page + 1) * PAGE - 1);

    if (error || !data?.length) break;
    out.push(...(data as DrawRow[]));
    if (data.length < PAGE) break;
    page++;
  }
  return out;
}

function buildYearHeatmap(draws: DrawRow[]): YearHeatCell[] {
  const endYear = new Date().getFullYear();
  const startYear = endYear - HEATMAP_YEARS + 1;
  const counts = new Map<number, number>();

  for (const row of draws) {
    const y = parseInt(row.draw_date.slice(0, 4), 10);
    if (y >= startYear && y <= endYear) {
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
  }

  const out: YearHeatCell[] = [];
  for (let y = startYear; y <= endYear; y++) {
    out.push({ year: y, hits: counts.get(y) ?? 0 });
  }
  return out;
}

async function buildOperatorBreakdown(
  number: string
): Promise<OperatorBreakdownRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const [{ data: stats }, { data: scores }] = await Promise.all([
    supabase
      .from("number_stats_v2")
      .select("operator, total_appearances, last_seen_date")
      .eq("number", number),
    supabase
      .from("number_scores")
      .select("scope, avg_gap_days, current_gap_days")
      .eq("number", number)
      .in("scope", [...V2_OPERATORS]),
  ]);

  const scoreByOp = new Map(
    (scores ?? []).map((s) => [
      s.scope as string,
      s as { avg_gap_days: number | null; current_gap_days: number | null },
    ])
  );

  const rows: OperatorBreakdownRow[] = (stats ?? []).map((s) => {
    const op = s.operator as string;
    const sc = scoreByOp.get(op);
    const avg = sc?.avg_gap_days ?? null;
    const cur = sc?.current_gap_days ?? null;
    const gapRatio =
      avg != null && avg > 0 && cur != null ? Math.round((cur / avg) * 100) / 100 : null;
    return {
      operator: op,
      hits: (s.total_appearances as number) ?? 0,
      avgGapDraws: avg != null ? Math.round(avg * 10) / 10 : null,
      lastSeen: (s.last_seen_date as string) ?? null,
      gapRatio,
    };
  });

  return rows.sort((a, b) => b.hits - a.hits);
}

async function buildColdCohort(number: string): Promise<{
  rank: number;
  total: number;
  peers: ColdPeer[];
}> {
  const supabase = createClient();
  if (!supabase) return { rank: 0, total: 0, peers: [] };

  const { data: selfRow } = await supabase
    .from("number_scores")
    .select("current_gap_days, avg_gap_days")
    .eq("number", number)
    .eq("scope", "all")
    .maybeSingle();

  const selfAvg = selfRow?.avg_gap_days as number | null;
  const selfCur = selfRow?.current_gap_days as number | null;
  if (!selfAvg || selfAvg <= 0 || selfCur == null) {
    return { rank: 0, total: 0, peers: [] };
  }

  const selfRatio = selfCur / selfAvg;
  const threshold = selfRatio / 2;

  const { data: scan } = await supabase
    .from("number_scores")
    .select("number, current_gap_days, avg_gap_days")
    .eq("scope", "all")
    .not("avg_gap_days", "is", null)
    .gt("avg_gap_days", 0)
    .not("current_gap_days", "is", null)
    .order("current_gap_days", { ascending: false })
    .limit(COLD_SCAN_LIMIT);

  const cohort = (scan ?? [])
    .map((r) => {
      const avg = r.avg_gap_days as number;
      const cur = r.current_gap_days as number;
      return {
        number: r.number as string,
        gapRatio: Math.round((cur / avg) * 100) / 100,
      };
    })
    .filter((r) => r.gapRatio >= threshold)
    .sort((a, b) => b.gapRatio - a.gapRatio);

  const rank = cohort.findIndex((c) => c.number === number) + 1;
  const peers = cohort.slice(0, 12).map((c) => ({
    ...c,
    isSelf: c.number === number,
  }));

  return { rank: rank || 0, total: cohort.length, peers };
}

function buildMirrorTimeline(
  selfDraws: DrawRow[],
  mirrorDraws: DrawRow[],
  since: string
): MirrorMonthRow[] {
  const months: string[] = [];
  const start = new Date(`${since.slice(0, 7)}-01T12:00:00Z`);
  const now = new Date();
  const cursor = new Date(start);
  while (cursor <= now) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const countByMonth = (draws: DrawRow[]) => {
    const m = new Map<string, number>();
    for (const d of draws) {
      const key = d.draw_date.slice(0, 7);
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  };

  const selfMap = countByMonth(selfDraws);
  const mirMap = countByMonth(mirrorDraws);

  return months.map((month) => ({
    month,
    self: selfMap.get(month) ?? 0,
    mirror: mirMap.get(month) ?? 0,
  }));
}

function computePreHitPattern(
  number: string,
  hitDates: string[],
  windowDraws: DrawRow[]
): PreHitPattern {
  const digit = tailDigit(number);
  const byDate = new Map<string, string[]>();

  for (const row of windowDraws) {
    const existing = byDate.get(row.draw_date) ?? [];
    byDate.set(row.draw_date, existing.concat(numbersFromDraw(row)));
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  const tailProp = (nums: string[]) => {
    if (nums.length === 0) return 0;
    let c = 0;
    for (const n of nums) if (tailDigit(n) === digit) c++;
    return c / nums.length;
  };

  const rolling: number[] = [];
  for (let i = PRE_HIT_WINDOW - 1; i < sortedDates.length; i++) {
    const nums: string[] = [];
    for (let j = i - PRE_HIT_WINDOW + 1; j <= i; j++) {
      nums.push(...(byDate.get(sortedDates[j]) ?? []));
    }
    rolling.push(tailProp(nums));
  }
  const baselineTailMean =
    rolling.length > 0
      ? rolling.reduce((a, b) => a + b, 0) / rolling.length
      : 0;

  const samples = hitDates.slice(-PRE_HIT_MAX_SAMPLES);
  const preProps: number[] = [];

  for (const hit of samples) {
    const end = addDays(hit, -1);
    const start = addDays(hit, -PRE_HIT_WINDOW);
    const nums: string[] = [];
    for (const dt of sortedDates) {
      if (dt >= start && dt <= end) nums.push(...(byDate.get(dt) ?? []));
    }
    if (nums.length > 0) preProps.push(tailProp(nums));
  }

  const preHitTailMean =
    preProps.length > 0
      ? preProps.reduce((a, b) => a + b, 0) / preProps.length
      : 0;

  return {
    windowDays: PRE_HIT_WINDOW,
    preHitTailMean: Math.round(preHitTailMean * 1000) / 1000,
    baselineTailMean: Math.round(baselineTailMean * 1000) / 1000,
    sampleHits: preProps.length,
  };
}

async function buildScoreTrend(number: string): Promise<ScoreTrendPoint[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("score_snapshots")
    .select("snapshot_date, overall_score")
    .eq("number", number)
    .order("snapshot_date", { ascending: true })
    .limit(365);

  return (data ?? []).map((r) => ({
    date: r.snapshot_date as string,
    score: r.overall_score as number,
  }));
}

/**
 * Build full VYRA number report (single number).
 * Query bounds: draws ≤20 pages/number; cold scan 800 rows; snapshots ≤365; pre-hit window ≤25 pages.
 */
export async function buildNumberReport(
  number: string
): Promise<NumberReportData | null> {
  const endYear = new Date().getFullYear();
  const sinceHeatmap = `${endYear - HEATMAP_YEARS + 1}-01-01`;
  const sinceMirror = monthsAgo(MIRROR_MONTHS);
  const mirrorNumber = mirrorOf(number);

  const [selfAllDraws, mirrorDraws, operatorBreakdown, coldCohort, scoreTrend, score] =
    await Promise.all([
      fetchNumberDraws(number, sinceHeatmap),
      fetchNumberDraws(mirrorNumber, sinceMirror),
      buildOperatorBreakdown(number),
      buildColdCohort(number),
      buildScoreTrend(number),
      getNumberScore(number, []),
    ]);

  const yearHeatmap = buildYearHeatmap(selfAllDraws);
  const mirrorTimeline = buildMirrorTimeline(
    selfAllDraws.filter((d) => d.draw_date >= sinceMirror),
    mirrorDraws,
    sinceMirror
  );

  const hitDates = Array.from(
    new Set(selfAllDraws.map((d) => d.draw_date))
  ).sort();

  let preHitPattern: PreHitPattern = {
    windowDays: PRE_HIT_WINDOW,
    preHitTailMean: 0,
    baselineTailMean: 0,
    sampleHits: 0,
  };

  if (hitDates.length > 0) {
    const sampleHits = hitDates.slice(-PRE_HIT_MAX_SAMPLES);
    const rangeStart = addDays(sampleHits[0], -PRE_HIT_WINDOW);
    const rangeEnd = sampleHits[sampleHits.length - 1];
    const windowDraws = await fetchDrawsInRange(rangeStart, rangeEnd);
    preHitPattern = computePreHitPattern(number, hitDates, windowDraws);
  }

  return {
    number,
    mirrorNumber,
    yearHeatmap,
    operatorBreakdown,
    coldCohort,
    mirrorTimeline,
    preHitPattern,
    scoreTrend,
    score,
  };
}
