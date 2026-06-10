/**
 * Number Score 纯计算层。无 I/O、无 Supabase 依赖，
 * 供回填脚本（GitHub Action）与每日增量（Cron）共用。
 */
import {
  SCORE_WEIGHTS,
  MIN_DATES_FOR_CYCLE,
  MIN_CAREER_DAYS,
  NEUTRAL_SCORE,
  MOMENTUM_BLEND,
} from "./config";

export interface NumberAggregate {
  number: string;
  totalHits: number;
  hits30d: number;
  hits90d: number;
  hits365d: number;
  /** 去重升序的出现日期 (YYYY-MM-DD) */
  uniqueDates: string[];
}

export interface NumberScoreRow {
  number: string;
  scope: string;
  total_hits: number;
  hits_30d: number;
  hits_90d: number;
  hits_365d: number;
  first_seen_date: string | null;
  last_seen_date: string | null;
  avg_gap_days: number | null;
  max_gap_days: number | null;
  current_gap_days: number | null;
  freq_score: number;
  cycle_score: number;
  momentum_score: number;
  mirror_score: number;
  overall_score: number;
}

const DAY_MS = 86_400_000;

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** 反转4位号码，如 1429 → 9241 */
export function mirrorOf(num: string): string {
  return num.split("").reverse().join("");
}

/**
 * 百分位排名（0-100），并列取中位处理。
 * 返回 Map<原值索引对应的值, 百分位>不可行（值重复），
 * 故输入输出按索引一一对应。
 */
export function percentileRanks(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [50];
  const sorted = [...values].sort((a, b) => a - b);
  // 值 → [严格小于的个数, 相等的个数]
  const firstIdx = new Map<number, number>();
  const count = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const v = sorted[i];
    if (!firstIdx.has(v)) firstIdx.set(v, i);
    count.set(v, (count.get(v) ?? 0) + 1);
  }
  return values.map((v) => {
    const below = firstIdx.get(v)!;
    const ties = count.get(v)!;
    return ((below + 0.5 * ties) / n) * 100;
  });
}

interface GapStats {
  avgGap: number | null;
  maxGap: number | null;
  currentGap: number | null;
}

function computeGaps(uniqueDates: string[], today: string): GapStats {
  if (uniqueDates.length === 0)
    return { avgGap: null, maxGap: null, currentGap: null };
  const last = uniqueDates[uniqueDates.length - 1];
  const currentGap = Math.max(0, daysBetween(last, today));
  if (uniqueDates.length < 2)
    return { avgGap: null, maxGap: null, currentGap };
  let sum = 0;
  let max = 0;
  for (let i = 1; i < uniqueDates.length; i++) {
    const g = daysBetween(uniqueDates[i - 1], uniqueDates[i]);
    sum += g;
    if (g > max) max = g;
  }
  return {
    avgGap: sum / (uniqueDates.length - 1),
    maxGap: max,
    currentGap,
  };
}

function cycleScore(gaps: GapStats, dateCount: number): number {
  if (
    dateCount < MIN_DATES_FOR_CYCLE ||
    gaps.avgGap === null ||
    gaps.avgGap <= 0 ||
    gaps.currentGap === null
  )
    return NEUTRAL_SCORE;
  const r = gaps.currentGap / gaps.avgGap;
  return Math.round(clamp(r * 50, 0, 100));
}

function momentumScore(
  agg: NumberAggregate,
  today: string
): number {
  if (agg.uniqueDates.length === 0) return 0;
  const careerDays = daysBetween(agg.uniqueDates[0], today);
  if (careerDays < MIN_CAREER_DAYS) return NEUTRAL_SCORE;
  const rate = agg.totalHits / careerDays;
  const expected30 = rate * 30;
  const expected90 = rate * 90;
  const m30 = agg.hits30d / Math.max(expected30, 0.05);
  const m90 = agg.hits90d / Math.max(expected90, 0.05);
  const m = MOMENTUM_BLEND.w30 * m30 + MOMENTUM_BLEND.w90 * m90;
  // 饱和曲线：m=1（等于历史均速）→ 50分；高于均速渐进逼近100，不撞顶
  return Math.round((100 * m) / (m + 1));
}

/**
 * 主入口：输入全部号码的聚合数据，输出可直接 upsert 的行。
 * @param today YYYY-MM-DD，由调用方传入保证可测试
 */
export function computeAllScores(
  aggregates: NumberAggregate[],
  today: string,
  scope = "all"
): NumberScoreRow[] {
  // freq 百分位（按 totalHits）
  const freqPct = percentileRanks(aggregates.map((a) => a.totalHits));
  // mirror 用 hits90d 百分位
  const hits90Pct = percentileRanks(aggregates.map((a) => a.hits90d));
  const pctByNumber = new Map<string, number>();
  aggregates.forEach((a, i) => pctByNumber.set(a.number, hits90Pct[i]));

  return aggregates.map((agg, i) => {
    const gaps = computeGaps(agg.uniqueDates, today);
    const freq = Math.round(freqPct[i]);
    const cycle = cycleScore(gaps, agg.uniqueDates.length);
    const momentum = momentumScore(agg, today);
    const mirror = Math.round(
      pctByNumber.get(mirrorOf(agg.number)) ?? NEUTRAL_SCORE
    );
    const overall = Math.round(
      freq * SCORE_WEIGHTS.freq +
        cycle * SCORE_WEIGHTS.cycle +
        momentum * SCORE_WEIGHTS.momentum +
        mirror * SCORE_WEIGHTS.mirror
    );
    return {
      number: agg.number,
      scope,
      total_hits: agg.totalHits,
      hits_30d: agg.hits30d,
      hits_90d: agg.hits90d,
      hits_365d: agg.hits365d,
      first_seen_date: agg.uniqueDates[0] ?? null,
      last_seen_date: agg.uniqueDates[agg.uniqueDates.length - 1] ?? null,
      avg_gap_days:
        gaps.avgGap === null ? null : Math.round(gaps.avgGap * 10) / 10,
      max_gap_days: gaps.maxGap,
      current_gap_days: gaps.currentGap,
      freq_score: freq,
      cycle_score: cycle,
      momentum_score: momentum,
      mirror_score: mirror,
      overall_score: overall,
    };
  });
}
