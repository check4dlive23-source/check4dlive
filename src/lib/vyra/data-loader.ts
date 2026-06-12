import {
  VYRA_REGION_SCOPE,
  VYRA_REGION_V2_OPERATORS,
  VYRA_SIGNAL_CONFIG,
} from "@/lib/vyra/config";
import type {
  VyraDetectInput,
  VyraDrawRow,
  VyraRegion,
  VyraScoreRow,
  VyraSignal,
  VyraSnapshotRow,
} from "@/lib/vyra/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function numbersFromDraw(row: VyraDrawRow): string[] {
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

function digitProportions(
  numbers: string[],
  pick: (n: string) => number
): number[] {
  const counts = Array(10).fill(0);
  let total = 0;
  for (const n of numbers) {
    if (!/^\d{4}$/.test(n)) continue;
    counts[pick(n)]++;
    total++;
  }
  if (total === 0) return Array(10).fill(0.1);
  return counts.map((c) => c / total);
}

function rollingDigitBaseline(
  draws: VyraDrawRow[],
  windowDays: number,
  pick: (n: string) => number
): { mean: number[]; std: number[] } {
  const byDate = new Map<string, string[]>();
  for (const row of draws) {
    const nums = numbersFromDraw(row);
    const existing = byDate.get(row.draw_date) ?? [];
    byDate.set(row.draw_date, existing.concat(nums));
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  const windowProps: number[][] = [];

  if (sortedDates.length >= windowDays) {
    for (let i = 0; i <= sortedDates.length - windowDays; i++) {
      const nums: string[] = [];
      for (let j = 0; j < windowDays; j++) {
        nums.push(...(byDate.get(sortedDates[i + j]) ?? []));
      }
      windowProps.push(digitProportions(nums, pick));
    }
  } else {
    const all = sortedDates.flatMap((dt) => byDate.get(dt) ?? []);
    windowProps.push(digitProportions(all, pick));
  }

  const mean = Array(10).fill(0);
  const std = Array(10).fill(0);
  for (let d = 0; d < 10; d++) {
    const vals = windowProps.map((w) => w[d]);
    mean[d] = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance =
      vals.reduce((acc, v) => acc + (v - mean[d]) ** 2, 0) / vals.length;
    std[d] = Math.sqrt(variance) || 0.01;
  }
  return { mean, std };
}

function findLastDigitSurgeDate(
  history: VyraDrawRow[],
  beforeDate: string,
  windowDays: number,
  digit: number,
  digitType: "tail" | "head",
  zThreshold: number
): string | null {
  const pick =
    digitType === "tail"
      ? (n: string) => parseInt(n[3], 10)
      : (n: string) => parseInt(n[0], 10);

  const lookbackStart = addDays(beforeDate, -180);
  const scoped = history.filter(
    (r) => r.draw_date >= lookbackStart && r.draw_date < beforeDate
  );
  if (scoped.length === 0) return null;

  const byDate = new Map<string, string[]>();
  for (const row of scoped) {
    const existing = byDate.get(row.draw_date) ?? [];
    byDate.set(row.draw_date, existing.concat(numbersFromDraw(row)));
  }

  const dates = Array.from(byDate.keys()).sort();
  if (dates.length < windowDays) return null;

  const baseline = rollingDigitBaseline(scoped, windowDays, pick);

  for (let i = dates.length - 1; i >= windowDays - 1; i--) {
    const endDate = dates[i];
    const windowNums: string[] = [];
    for (let j = i - windowDays + 1; j <= i; j++) {
      windowNums.push(...(byDate.get(dates[j]) ?? []));
    }
    const recent = digitProportions(windowNums, pick);
    const z = (recent[digit] - baseline.mean[digit]) / baseline.std[digit];
    if (Math.abs(z) >= zThreshold) return endDate;
  }
  return null;
}

function enrichOverdueContext(
  signal: VyraSignal,
  scores: VyraScoreRow[]
): Record<string, number | string> {
  const num = String(signal.data.number ?? signal.numbers[0] ?? "");
  const row = scores.find((s) => s.number === num);
  const ranked = scores
    .filter((s) => s.current_gap_days != null && s.current_gap_days > 0)
    .sort((a, b) => (b.current_gap_days ?? 0) - (a.current_gap_days ?? 0));

  const ctx: Record<string, number | string> = {};
  const rank = ranked.findIndex((s) => s.number === num);
  if (rank >= 0) ctx.coldRank = rank + 1;

  const record = ranked[0];
  if (record?.current_gap_days != null && row?.current_gap_days != null) {
    ctx.recordGapDraws = record.current_gap_days;
    ctx.recordNumber = record.number;
    ctx.gapToRecordDraws = record.current_gap_days - row.current_gap_days;
  }

  if (row?.last_seen_date) {
    ctx.lastHitDate = row.last_seen_date;
    ctx.lastHitYear = row.last_seen_date.slice(0, 4);
  }

  return ctx;
}

function enrichDigitSurgeContext(
  signal: VyraSignal,
  input: VyraDetectInput,
  date: string
): Record<string, number | string> {
  const digit = Number(signal.data.digit);
  const digitType = String(signal.data.digitType) as "tail" | "head";
  if (!Number.isFinite(digit) || (digitType !== "tail" && digitType !== "head")) {
    return {};
  }

  const { windowDays, zThreshold } = VYRA_SIGNAL_CONFIG.digitSurge;
  const lastActive = findLastDigitSurgeDate(
    input.drawsHistory,
    date,
    windowDays,
    digit,
    digitType,
    zThreshold
  );

  const ctx: Record<string, number | string> = {};
  if (lastActive) ctx.lastActiveDate = lastActive;
  return ctx;
}

function enrichScoreJumpContext(
  signal: VyraSignal,
  snapshotsToday: VyraSnapshotRow[]
): Record<string, number | string> {
  if (snapshotsToday.length < 20) return {};

  const num = String(signal.data.number ?? signal.numbers[0] ?? "");
  const row = snapshotsToday.find((s) => s.number === num);
  if (!row) return {};

  const scores = snapshotsToday.map((s) => s.overall_score).sort((a, b) => a - b);
  const belowOrEqual = scores.filter((s) => s <= row.overall_score).length;
  const percentile = Math.round((belowOrEqual / scores.length) * 1000) / 10;

  const ctx: Record<string, number | string> = { scorePercentile: percentile };
  if (percentile >= 95) ctx.scoreTier = "top5pct";
  return ctx;
}

/** Attach optional context ammo to signals — omit keys when not computable. */
export function enrichSignalsWithContext(
  signals: VyraSignal[],
  input: VyraDetectInput,
  region: VyraRegion,
  date: string
): VyraSignal[] {
  const scope = VYRA_REGION_SCOPE[region];
  const scopedScores = input.scores.filter((s) => s.scope === scope);

  return signals.map((signal) => {
    let context: Record<string, number | string> = {};

    switch (signal.type) {
      case "overdue":
        context = enrichOverdueContext(signal, scopedScores);
        break;
      case "digit_surge":
        context = enrichDigitSurgeContext(signal, input, date);
        break;
      case "score_jump":
        context = enrichScoreJumpContext(signal, input.snapshotsToday);
        break;
      default:
        break;
    }

    const cleaned = Object.fromEntries(
      Object.entries(context).filter(([, v]) => v !== "" && v != null)
    );

    if (Object.keys(cleaned).length === 0) return signal;

    return { ...signal, context: cleaned };
  });
}

async function fetchRegionDraws(
  supabase: SupabaseClient,
  operators: readonly string[],
  since?: string
): Promise<VyraDrawRow[]> {
  const pageSize = 1000;
  let page = 0;
  const out: VyraDrawRow[] = [];

  while (true) {
    let q = supabase
      .from("draw_results_v2")
      .select(
        "draw_date, operator, first_prize, second_prize, third_prize, special_numbers, consolation_numbers"
      )
      .in("operator", [...operators])
      .order("draw_date", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (since) q = q.gte("draw_date", since);

    const { data, error } = await q;
    if (error) throw new Error(`draw_results_v2: ${error.message}`);
    if (!data?.length) break;
    out.push(...(data as VyraDrawRow[]));
    if (data.length < pageSize) break;
    page++;
  }
  return out;
}

export async function loadVyraDetectInput(
  supabase: SupabaseClient,
  region: VyraRegion,
  date: string
): Promise<VyraDetectInput> {
  const operators = VYRA_REGION_V2_OPERATORS[region];
  const scope = VYRA_REGION_SCOPE[region];
  const lookback = Math.max(
    VYRA_SIGNAL_CONFIG.mirrorSync.windowDays,
    VYRA_SIGNAL_CONFIG.digitSurge.windowDays
  );
  const recentSince = addDays(date, -(lookback - 1));

  const [drawsHistory, drawsRecent, scoresRes, snapTodayRes, snapPastRes] =
    await Promise.all([
      fetchRegionDraws(supabase, operators),
      fetchRegionDraws(supabase, operators, recentSince),
      supabase
        .from("number_scores")
        .select(
          "number, scope, total_hits, current_gap_days, avg_gap_days, last_seen_date, max_gap_days"
        )
        .eq("scope", scope),
      supabase
        .from("score_snapshots")
        .select("snapshot_date, number, overall_score")
        .eq("snapshot_date", date),
      supabase
        .from("score_snapshots")
        .select("snapshot_date, number, overall_score")
        .eq(
          "snapshot_date",
          addDays(date, -VYRA_SIGNAL_CONFIG.scoreJump.windowDays)
        ),
    ]);

  if (scoresRes.error) throw new Error(`number_scores: ${scoresRes.error.message}`);
  if (snapTodayRes.error) throw new Error(`score_snapshots today: ${snapTodayRes.error.message}`);
  if (snapPastRes.error) throw new Error(`score_snapshots past: ${snapPastRes.error.message}`);

  return {
    drawsRecent,
    drawsHistory,
    scores: (scoresRes.data ?? []) as VyraScoreRow[],
    snapshotsToday: (snapTodayRes.data ?? []) as VyraSnapshotRow[],
    snapshotsWeekAgo: (snapPastRes.data ?? []) as VyraSnapshotRow[],
  };
}

export async function loadLongestColdForRegion(
  supabase: SupabaseClient,
  region: VyraRegion
): Promise<{ number: string; draws: number } | null> {
  const scope = VYRA_REGION_SCOPE[region];
  const { data, error } = await supabase
    .from("number_scores")
    .select("number, current_gap_days")
    .eq("scope", scope)
    .not("current_gap_days", "is", null)
    .order("current_gap_days", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.number || data.current_gap_days == null) return null;
  return { number: data.number as string, draws: data.current_gap_days as number };
}

/** Parse context ammo on a signal */
export function parseSignalContext(
  signal: VyraSignal
): Record<string, number | string> {
  if (signal.context && Object.keys(signal.context).length > 0) {
    return signal.context;
  }
  const raw = signal.data.context;
  if (typeof raw !== "string" || !raw) return {};
  try {
    return JSON.parse(raw) as Record<string, number | string>;
  } catch {
    return {};
  }
}

/** Brief payload for Claude — signals with parsed context object. */
export function briefDataForNarrative(
  brief: import("@/lib/vyra/types").VyraBriefData
): Record<string, unknown> {
  return {
    region: brief.region,
    date: brief.date,
    quiet: brief.quiet,
    fieldUnits: {
      currentGapDraws: "期(draw periods), NOT calendar days",
      avgGapDraws: "期",
      gapToRecordDraws: "期 behind regional record",
      recordGapDraws: "期",
      lastHitDate: "calendar date for elapsed time phrasing",
      z: "digit_surge: negative=cold/below, positive=hot/above",
    },
    signals: brief.signals.map((s) => ({
      type: s.type,
      surprise: s.surprise,
      numbers: s.numbers,
      facts: s.data,
      context: parseSignalContext(s),
    })),
  };
}
