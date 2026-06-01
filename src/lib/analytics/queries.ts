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

async function historyCount(): Promise<number> {
  const supabase = createClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("draw_history")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function getHotNumbers(
  period: "30d" | "100draws"
): Promise<{ rows: HotNumberRow[]; source: "db" | "mock" }> {
  const empty = isAnalyticsEmpty(await historyCount());
  if (empty) return { rows: MOCK_HOT.slice(0, 20), source: "mock" };

  const supabase = createClient();
  if (!supabase) return { rows: MOCK_HOT.slice(0, 20), source: "mock" };

  let historyQuery = supabase
    .from("draw_history")
    .select("number, date, position");

  if (period === "30d") {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    historyQuery = historyQuery.gte("date", since.toISOString().split("T")[0]);
  } else {
    const { data: recentDraws } = await supabase
      .from("draws")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(100);
    const ids = (recentDraws ?? []).map((d) => d.id);
    if (ids.length === 0) return { rows: MOCK_HOT.slice(0, 20), source: "mock" };
    historyQuery = historyQuery.in("draw_id", ids);
  }

  const { data, error } = await historyQuery;
  if (error || !data?.length) {
    return { rows: MOCK_HOT.slice(0, 20), source: "mock" };
  }

  const map = new Map<
    string,
    { total: number; first: number; last: string }
  >();
  for (const row of data) {
    const n = row.number as string;
    const cur = map.get(n) ?? { total: 0, first: 0, last: "" };
    cur.total += 1;
    if (row.position === "first") cur.first += 1;
    if (!cur.last || row.date > cur.last) cur.last = row.date as string;
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
    .slice(0, 20);

  return { rows: rows.length ? rows : MOCK_HOT.slice(0, 20), source: "db" };
}

export async function getColdNumbers(
  minGap: number
): Promise<{ rows: ColdNumberRow[]; source: "db" | "mock" }> {
  const empty = isAnalyticsEmpty(await historyCount());
  if (empty) return { rows: MOCK_COLD, source: "mock" };

  const supabase = createClient();
  if (!supabase) return { rows: MOCK_COLD, source: "mock" };

  const { data, error } = await supabase
    .from("number_stats")
    .select("number, last_seen_date, current_gap_days, total_hits")
    .gte("current_gap_days", minGap)
    .order("current_gap_days", { ascending: false })
    .limit(50);

  if (error || !data?.length) {
    return { rows: MOCK_COLD, source: "mock" };
  }

  const rows: ColdNumberRow[] = data.map((r) => ({
    number: r.number as string,
    last_seen_date: (r.last_seen_date as string) ?? null,
    gap_days: (r.current_gap_days as number) ?? minGap,
    total_hits: (r.total_hits as number) ?? 0,
  }));

  return { rows, source: "db" };
}

function emptyDigitGrid(): DigitAnalysis["thousands"] {
  return Array.from({ length: 10 }, (_, d) => ({ digit: d, count: 0 }));
}

function buildDigitAnalysis(numbers: string[]): DigitAnalysis {
  const grids = [
    emptyDigitGrid(),
    emptyDigitGrid(),
    emptyDigitGrid(),
    emptyDigitGrid(),
  ];
  for (const num of numbers) {
    if (!/^\d{4}$/.test(num)) continue;
    for (let i = 0; i < 4; i++) {
      const d = parseInt(num[i], 10);
      grids[i][d].count += 1;
    }
  }
  return {
    thousands: grids[0],
    hundreds: grids[1],
    tens: grids[2],
    units: grids[3],
  };
}

export async function getDigitAnalysis(): Promise<{
  data: DigitAnalysis;
  source: "db" | "mock";
}> {
  const empty = isAnalyticsEmpty(await historyCount());
  if (empty) return { data: MOCK_DIGIT, source: "mock" };

  const supabase = createClient();
  if (!supabase) return { data: MOCK_DIGIT, source: "mock" };

  const { data, error } = await supabase
    .from("draw_history")
    .select("number")
    .limit(5000);

  if (error || !data?.length) {
    return { data: MOCK_DIGIT, source: "mock" };
  }

  const numbers = data.map((r) => r.number as string);
  return { data: buildDigitAnalysis(numbers), source: "db" };
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

export async function getPatterns(): Promise<{
  rows: PatternRow[];
  source: "db" | "mock";
}> {
  const empty = isAnalyticsEmpty(await historyCount());
  if (empty) return { rows: MOCK_PATTERNS, source: "mock" };

  const supabase = createClient();
  if (!supabase) return { rows: MOCK_PATTERNS, source: "mock" };

  const { data, error } = await supabase
    .from("draw_history")
    .select("number");

  if (error || !data?.length) {
    return { rows: MOCK_PATTERNS, source: "mock" };
  }

  const counts = new Map<string, number>();
  for (const row of data) {
    const n = row.number as string;
    counts.set(n, (counts.get(n) ?? 0) + 1);
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
