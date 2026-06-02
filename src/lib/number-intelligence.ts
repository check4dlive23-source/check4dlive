import { createClient } from "@/lib/supabase/server";
import { calculateHeatScore } from "@/lib/heat-score";
import type { OperatorId } from "@/types";
import type {
  HeatLevel,
  NumberIntelligenceResponse,
  NumberIntelligenceExtras,
  NumberStatsPayload,
  OperatorBreakdown,
  RecentAppearance,
  RelatedNumber,
  TimelinePoint,
} from "@/types/number-intelligence";

const OPERATOR_LABELS: Record<OperatorId, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Sports Toto",
  sabah: "Sabah",
  sarawak: "Cash Sweep",
  sandakan: "Sandakan STC",
  gd: "Grand Dragon",
  perdana: "Perdana",
  hari: "Lucky Hari Hari",
  sgpools: "Singapore Pools",
};

const ALL_OPERATORS: OperatorId[] = [
  "magnum",
  "damacai",
  "toto",
  "sabah",
  "sarawak",
  "sandakan",
  "gd",
  "perdana",
  "hari",
  "sgpools",
];

interface HistoryRow {
  date: string;
  operator: string;
  position: string;
  draw_id?: string | null;
  draws?: { draw_no: string | null } | { draw_no: string | null }[] | null;
}

function resolveDrawNo(
  draws: HistoryRow["draws"]
): string | null {
  if (!draws) return null;
  if (Array.isArray(draws)) return draws[0]?.draw_no ?? null;
  return draws.draw_no ?? null;
}

function normalizeHistoryRow(raw: Record<string, unknown>): HistoryRow {
  const drawsRaw = raw.draws;
  let draws: HistoryRow["draws"];
  if (Array.isArray(drawsRaw) && drawsRaw[0]) {
    draws = drawsRaw[0] as { draw_no: string | null };
  } else if (drawsRaw && typeof drawsRaw === "object") {
    draws = drawsRaw as { draw_no: string | null };
  }
  return {
    date: String(raw.date),
    operator: String(raw.operator),
    position: String(raw.position),
    draw_id: raw.draw_id != null ? String(raw.draw_id) : null,
    draws,
  };
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
  if (position.startsWith("special")) return { label: "Special", tier: "special" };
  return { label: "Consolation", tier: "consolation" };
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.max(0, Math.round(Math.abs(db - da) / 86_400_000));
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

function buildTimeline(rows: HistoryRow[]): TimelinePoint[] {
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

function buildBreakdown(rows: HistoryRow[]): OperatorBreakdown[] {
  const map = new Map<OperatorId, OperatorBreakdown>();

  for (const op of ALL_OPERATORS) {
    map.set(op, {
      operator: op,
      label: OPERATOR_LABELS[op],
      total: 0,
      first: 0,
      second: 0,
      third: 0,
      special: 0,
      consolation: 0,
    });
  }

  for (const row of rows) {
    const op = row.operator as OperatorId;
    if (!map.has(op)) continue;
    const entry = map.get(op)!;
    entry.total += 1;
    if (row.position === "first") entry.first += 1;
    else if (row.position === "second") entry.second += 1;
    else if (row.position === "third") entry.third += 1;
    else if (row.position.startsWith("special")) entry.special += 1;
    else entry.consolation += 1;
  }

  return Array.from(map.values()).filter((b) => b.total > 0);
}

function computeStatsFromHistory(
  number: string,
  rows: HistoryRow[]
): NumberStatsPayload {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let first = 0;
  let second = 0;
  let third = 0;
  let special = 0;
  let consolation = 0;

  for (const row of rows) {
    if (row.position === "first") first += 1;
    else if (row.position === "second") second += 1;
    else if (row.position === "third") third += 1;
    else if (row.position.startsWith("special")) special += 1;
    else consolation += 1;
  }

  const last = sorted[0];
  const today = new Date().toISOString().split("T")[0];
  const currentGap = last ? daysBetween(last.date, today) : null;

  let avgGap: number | null = null;
  if (sorted.length >= 2) {
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      gaps.push(daysBetween(sorted[i].date, sorted[i + 1].date));
    }
    avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  }

  const firstDate = sorted[sorted.length - 1]?.date;
  const daysSinceFirst = firstDate
    ? daysBetween(firstDate, today) || 1
    : 1;
  const heatScore = calculateHeatScore(
    rows.length,
    daysSinceFirst,
    currentGap ?? 0
  );

  return {
    number,
    total_hits: rows.length,
    first_prize_hits: first,
    second_prize_hits: second,
    third_prize_hits: third,
    special_hits: special,
    consolation_hits: consolation,
    last_seen_date: last?.date ?? null,
    last_seen_operator: last?.operator ?? null,
    last_seen_position: last?.position ?? null,
    avg_gap_days: avgGap != null ? Math.round(avgGap * 10) / 10 : null,
    current_gap_days: currentGap,
    heat_score: Math.round(heatScore * 1000) / 1000,
    heat_level: computeHeatLevel(rows.length, currentGap, avgGap),
  };
}

function statsFromDbRow(
  number: string,
  row: Record<string, unknown>
): NumberStatsPayload {
  const total = (row.total_hits as number) ?? 0;
  const currentGap = (row.current_gap_days as number) ?? null;
  const avgGap = (row.avg_gap_days as number) ?? null;
  return {
    number,
    total_hits: total,
    first_prize_hits: (row.first_prize_hits as number) ?? 0,
    second_prize_hits: (row.second_prize_hits as number) ?? 0,
    third_prize_hits: (row.third_prize_hits as number) ?? 0,
    special_hits: (row.special_hits as number) ?? 0,
    consolation_hits: (row.consolation_hits as number) ?? 0,
    last_seen_date: (row.last_seen_date as string) ?? null,
    last_seen_operator: (row.last_seen_operator as string) ?? null,
    last_seen_position: (row.last_seen_position as string) ?? null,
    avg_gap_days: avgGap,
    current_gap_days: currentGap,
    heat_score: (row.heat_score as number) ?? null,
    heat_level: computeHeatLevel(total, currentGap, avgGap),
  };
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

async function buildRelatedNumbers(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  number: string
): Promise<RelatedNumber[]> {
  const related: RelatedNumber[] = [];
  const last2 = number.slice(2);

  const { data: sameTail } = await supabase
    .from("number_stats")
    .select("number, total_hits")
    .like("number", `%${last2}`)
    .neq("number", number)
    .order("total_hits", { ascending: false })
    .limit(5);

  for (const row of sameTail ?? []) {
    related.push({
      number: row.number as string,
      reason: "same_last2",
      total_hits: (row.total_hits as number) ?? 0,
    });
  }

  const perms = permutationsOf(number.split(""))
    .filter((p) => p !== number && /^\d{4}$/.test(p))
    .slice(0, 6);

  if (perms.length > 0) {
    const { data: permRows } = await supabase
      .from("number_stats")
      .select("number, total_hits")
      .in("number", perms);

    for (const row of permRows ?? []) {
      related.push({
        number: row.number as string,
        reason: "permutation",
        total_hits: (row.total_hits as number) ?? 0,
      });
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
  supabase: NonNullable<ReturnType<typeof createClient>>,
  number: string,
  stats: NumberStatsPayload
): Promise<NumberIntelligenceExtras> {
  const twoYearsAgo = new Date();
  twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);
  const since = twoYearsAgo.toISOString().split("T")[0];

  const { count: totalDraws } = await supabase
    .from("draws")
    .select("*", { count: "exact", head: true })
    .gte("date", since);

  const total = totalDraws ?? 0;
  const winPct =
    total > 0 ? Math.round((stats.total_hits / total) * 10000) / 100 : 0;

  let predictedNext: string | null = null;
  if (stats.avg_gap_days != null && stats.last_seen_date) {
    const d = new Date(stats.last_seen_date);
    d.setDate(d.getDate() + Math.round(stats.avg_gap_days));
    predictedNext = d.toISOString().split("T")[0];
  }

  const related_numbers = await buildRelatedNumbers(supabase, number);

  return {
    total_draws_analyzed: total,
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
      items: [],
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
  options?: { page?: number; pageSize?: number }
): Promise<NumberIntelligenceResponse | null> {
  const number = normalize4D(rawNumber);
  if (!isValid4D(number)) return null;

  const page = Math.max(1, Math.floor(options?.page ?? 1));
  const pageSize = Math.max(1, Math.floor(options?.pageSize ?? 50));

  const supabase = createClient();
  if (!supabase) return emptyResponse(number);

  const twoYearsAgo = new Date();
  twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);
  const since = twoYearsAgo.toISOString().split("T")[0];

  const { data: history, error: histErr } = await supabase
    .from("draw_history")
    .select("date, operator, position, draw_id, draws(draw_no)")
    .eq("number", number)
    .gte("date", since)
    .order("date", { ascending: false });

  if (histErr) {
    throw new Error(histErr.message);
  }

  const rows = (history ?? []).map((r) =>
    normalizeHistoryRow(r as Record<string, unknown>)
  );

  const { data: statsRow } = await supabase
    .from("number_stats")
    .select("*")
    .eq("number", number)
    .maybeSingle();

  const stats =
    statsRow && (statsRow.total_hits as number) > 0
      ? statsFromDbRow(number, statsRow as Record<string, unknown>)
      : computeStatsFromHistory(number, rows);

  const { data: recentRows } = await supabase
    .from("draw_history")
    .select("date, operator, position, draws(draw_no)")
    .eq("number", number)
    .order("date", { ascending: false })
    .limit(20);

  const recent: RecentAppearance[] = (recentRows ?? []).map((r) => {
    const row = normalizeHistoryRow(r as Record<string, unknown>);
    const parsed = parsePosition(row.position);
    return {
      date: row.date,
      operator: row.operator as OperatorId,
      position: row.position,
      position_label: parsed.label,
      position_tier: parsed.tier,
      draw_no: resolveDrawNo(row.draws),
    };
  });

  const extras = await buildExtras(supabase, number, stats);

  const historyFrom = "2010-01-01";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { count: total } = await supabase
    .from("draw_history")
    .select("id", { count: "exact", head: true })
    .eq("number", number)
    .gte("date", historyFrom);

  const { data: historyRows } = await supabase
    .from("draw_history")
    .select("date, operator, position, draws(draw_no)")
    .eq("number", number)
    .gte("date", historyFrom)
    .order("date", { ascending: false })
    .range(from, to);

  const historyItems: RecentAppearance[] = (historyRows ?? []).map((r) => {
    const row = normalizeHistoryRow(r as Record<string, unknown>);
    const parsed = parsePosition(row.position);
    return {
      date: row.date,
      operator: row.operator as OperatorId,
      position: row.position,
      position_label: parsed.label,
      position_tier: parsed.tier,
      draw_no: resolveDrawNo(row.draws),
    };
  });

  return {
    number,
    stats,
    timeline: buildTimeline(rows),
    breakdown: buildBreakdown(rows),
    recent,
    history: {
      items: historyItems,
      page,
      pageSize,
      total: total ?? 0,
    },
    extras,
  };
}
