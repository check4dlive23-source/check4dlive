import { mirrorOf } from "@/lib/score/compute";
import {
  VYRA_REGION_SCOPE,
  VYRA_SCORE_JUMP_SCOPE,
  VYRA_SIGNAL_CONFIG,
} from "@/lib/vyra/config";
import type {
  VyraBriefData,
  VyraDetectInput,
  VyraDrawRow,
  VyraRegion,
  VyraSignal,
} from "@/lib/vyra/types";

type Config = typeof VYRA_SIGNAL_CONFIG;

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

function filterDrawsInWindow(
  draws: VyraDrawRow[],
  endDate: string,
  windowDays: number
): VyraDrawRow[] {
  const start = addDays(endDate, -(windowDays - 1));
  return draws.filter((d) => d.draw_date >= start && d.draw_date <= endDate);
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

function digitSurgeSignals(
  region: VyraRegion,
  date: string,
  recentNumbers: string[],
  historyDraws: VyraDrawRow[],
  cfg: Config["digitSurge"],
  digitType: "tail" | "head"
): VyraSignal[] {
  const pick =
    digitType === "tail"
      ? (n: string) => parseInt(n[3], 10)
      : (n: string) => parseInt(n[0], 10);

  const recent = digitProportions(recentNumbers, pick);
  const { mean, std } = rollingDigitBaseline(
    historyDraws,
    cfg.windowDays,
    pick
  );

  const out: VyraSignal[] = [];
  for (let d = 0; d < 10; d++) {
    const z = (recent[d] - mean[d]) / std[d];
    if (Math.abs(z) < cfg.zThreshold) continue;

    const matching = recentNumbers.filter((n) => pick(n) === d);
    out.push({
      type: "digit_surge",
      surprise: Math.abs(z),
      numbers: Array.from(new Set(matching)).slice(0, 8),
      data: {
        region,
        date,
        digit: d,
        digitType,
        z: Math.round(z * 100) / 100,
        proportion: Math.round(recent[d] * 1000) / 1000,
        baselineMean: Math.round(mean[d] * 1000) / 1000,
        windowDays: cfg.windowDays,
      },
    });
  }
  return out;
}

/** Recent window tail/head digit z-score vs historical rolling windows. */
export function detectDigitSurge(
  region: VyraRegion,
  date: string,
  input: VyraDetectInput,
  config: Config = VYRA_SIGNAL_CONFIG
): VyraSignal[] {
  const { windowDays } = config.digitSurge;
  const recentDraws = filterDrawsInWindow(input.drawsRecent, date, windowDays);
  const recentNumbers = recentDraws.flatMap(numbersFromDraw);
  if (recentNumbers.length === 0) return [];

  return [
    ...digitSurgeSignals(
      region,
      date,
      recentNumbers,
      input.drawsHistory,
      config.digitSurge,
      "tail"
    ),
    ...digitSurgeSignals(
      region,
      date,
      recentNumbers,
      input.drawsHistory,
      config.digitSurge,
      "head"
    ),
  ];
}

/** Scope-scoped numbers with gap ratio above threshold. */
export function detectOverdue(
  region: VyraRegion,
  date: string,
  input: VyraDetectInput,
  config: Config = VYRA_SIGNAL_CONFIG
): VyraSignal[] {
  const { gapRatioMin, minHistoricalHits, topN } = config.overdue;
  const scope = VYRA_REGION_SCOPE[region];

  const candidates = input.scores
    .filter((s) => s.scope === scope)
    .map((s) => {
      const avg = s.avg_gap_days ?? 0;
      const cur = s.current_gap_days ?? 0;
      const ratio = avg > 0 ? cur / avg : 0;
      return { ...s, ratio };
    })
    .filter(
      (s) =>
        s.total_hits >= minHistoricalHits &&
        s.avg_gap_days != null &&
        s.avg_gap_days > 0 &&
        s.current_gap_days != null &&
        s.ratio >= gapRatioMin
    )
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, topN);

  return candidates.map((s) => ({
    type: "overdue" as const,
    surprise: s.ratio,
    numbers: [s.number],
    data: {
      region,
      date,
      scope,
      number: s.number,
      ratio: Math.round(s.ratio * 100) / 100,
      currentGapDraws: s.current_gap_days ?? 0,
      avgGapDraws: Math.round(Number(s.avg_gap_days) * 10) / 10,
      totalHits: s.total_hits,
      lastSeenDate: s.last_seen_date ?? "",
    },
  }));
}

/** All-scope score delta vs N days ago (snapshots lack per-scope — TODO). */
export function detectScoreJump(
  date: string,
  input: VyraDetectInput,
  config: Config = VYRA_SIGNAL_CONFIG
): VyraSignal[] {
  const { jumpThreshold, topN, windowDays } = config.scoreJump;
  const pastMap = new Map(
    input.snapshotsWeekAgo.map((s) => [s.number, s.overall_score])
  );

  const jumps = input.snapshotsToday
    .map((s) => {
      const past = pastMap.get(s.number);
      if (past == null) return null;
      const delta = s.overall_score - past;
      return { number: s.number, delta, today: s.overall_score, past };
    })
    .filter(
      (j): j is NonNullable<typeof j> =>
        j != null && Math.abs(j.delta) >= jumpThreshold
    )
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, topN);

  return jumps.map((j) => ({
    type: "score_jump" as const,
    surprise: Math.abs(j.delta),
    numbers: [j.number],
    data: {
      date,
      scope: VYRA_SCORE_JUMP_SCOPE,
      number: j.number,
      delta: j.delta,
      scoreToday: j.today,
      scorePast: j.past,
      windowDays,
    },
  }));
}

/** Mirror pairs both drawn in recent window (dedupe X < mirror(X)). */
export function detectMirrorSync(
  region: VyraRegion,
  date: string,
  input: VyraDetectInput,
  config: Config = VYRA_SIGNAL_CONFIG
): VyraSignal[] {
  const recentDraws = filterDrawsInWindow(
    input.drawsRecent,
    date,
    config.mirrorSync.windowDays
  );
  const drawn = new Set(recentDraws.flatMap(numbersFromDraw));
  if (drawn.size === 0) return [];

  const pairs: string[][] = [];
  for (const x of Array.from(drawn)) {
    const m = mirrorOf(x);
    if (m === x) continue;
    if (drawn.has(m) && x < m) {
      pairs.push([x, m]);
    }
  }

  if (pairs.length === 0) return [];

  const flat = pairs.flat();
  return [
    {
      type: "mirror_sync",
      surprise: pairs.length,
      numbers: flat,
      data: {
        region,
        date,
        pairCount: pairs.length,
        windowDays: config.mirrorSync.windowDays,
        pairs: pairs.map((p) => p.join("/")).join(","),
      },
    },
  ];
}

function normalizeSurprise(signals: VyraSignal[]): VyraSignal[] {
  if (signals.length === 0) return [];
  const max = Math.max(...signals.map((s) => s.surprise), 1e-9);
  return signals.map((s) => ({
    ...s,
    surprise: Math.round((s.surprise / max) * 1000) / 1000,
  }));
}

/** Free tier shows top 2 — ensure different signal types when possible. */
export function diversifyFreeTierTop2(sorted: VyraSignal[]): VyraSignal[] {
  if (sorted.length < 2 || sorted[0].type !== sorted[1].type) return sorted;
  const altIdx = sorted.findIndex((s, i) => i >= 2 && s.type !== sorted[0].type);
  if (altIdx < 0) return sorted;
  const out = [...sorted];
  const alt = out[altIdx];
  out.splice(altIdx, 1);
  out.splice(1, 0, alt);
  return out;
}

/** Merge detectors, normalize surprise, sort desc, truncate, quiet flag. */
export function buildBriefData(
  region: VyraRegion,
  date: string,
  input: VyraDetectInput,
  config: Config = VYRA_SIGNAL_CONFIG
): VyraBriefData {
  const raw: VyraSignal[] = [
    ...detectDigitSurge(region, date, input, config),
    ...detectOverdue(region, date, input, config),
    ...detectScoreJump(date, input, config),
    ...detectMirrorSync(region, date, input, config),
  ];

  const sorted = normalizeSurprise(raw).sort((a, b) => b.surprise - a.surprise);
  const diversified = diversifyFreeTierTop2(sorted);
  const signals = diversified.slice(0, config.maxSignalsPerBrief);

  return {
    region,
    date,
    signals,
    quiet: signals.length === 0,
  };
}
