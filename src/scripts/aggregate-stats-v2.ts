/**
 * Aggregate draw_results_v2 → number_stats_v2.
 *
 * Expands every prize position of each historical draw into number-level
 * appearances, then upserts per (number, operator) statistics. This fills the
 * previously-empty number_stats_v2 table.
 *
 * Algorithm mirrors the v1 aggregation in src/scripts/bulk-import.ts
 * (lines ~453–558), adapted to v2's denormalized columns + text[] arrays.
 *
 * Run: npm run aggregate:v2
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";

loadEnvLocal();

const PAGE = 1000;
const UPSERT_BATCH = 500;

type PrizeType = "first" | "second" | "third" | "special" | "consolation";

/** Higher number = higher priority when two prize types share the same date. */
const PRIZE_PRIORITY: Record<PrizeType, number> = {
  first: 5,
  second: 4,
  third: 3,
  special: 2,
  consolation: 1,
};

interface Agg {
  total: number;
  first: number;
  second: number;
  third: number;
  special: number;
  consolation: number;
  lastDate: string | null;
  lastPrizeType: PrizeType | null;
}

function newAgg(): Agg {
  return {
    total: 0,
    first: 0,
    second: 0,
    third: 0,
    special: 0,
    consolation: 0,
    lastDate: null,
    lastPrizeType: null,
  };
}

function isValid4D(n: unknown): n is string {
  return typeof n === "string" && /^\d{4}$/.test(n);
}

/** Record one number appearance into the per-operator aggregation map. */
function record(
  map: Map<string, Agg>,
  number: string,
  type: PrizeType,
  date: string
): void {
  let a = map.get(number);
  if (!a) {
    a = newAgg();
    map.set(number, a);
  }

  a.total += 1;
  a[type] += 1;

  if (a.lastDate === null || date > a.lastDate) {
    a.lastDate = date;
    a.lastPrizeType = type;
  } else if (
    date === a.lastDate &&
    (a.lastPrizeType === null ||
      PRIZE_PRIORITY[type] > PRIZE_PRIORITY[a.lastPrizeType])
  ) {
    a.lastPrizeType = type;
  }
}

interface DrawResultV2Read {
  draw_date: string;
  first_prize: string | null;
  second_prize: string | null;
  third_prize: string | null;
  special_numbers: string[] | null;
  consolation_numbers: string[] | null;
}

type SupabaseLike = NonNullable<ReturnType<typeof createServerClient>>;

/** Distinct operator values present in draw_results_v2 (operator column only). */
async function listOperators(supabase: SupabaseLike): Promise<string[]> {
  const set = new Set<string>();
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("draw_results_v2")
      .select("operator")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`list operators: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const r of data) set.add((r as { operator: string }).operator);

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return Array.from(set).sort();
}

/** Aggregate one operator and upsert its rows into number_stats_v2. */
async function aggregateOperator(
  supabase: SupabaseLike,
  operator: string
): Promise<{ draws: number; stats: number }> {
  const map = new Map<string, Agg>();
  let drawCount = 0;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("draw_results_v2")
      .select(
        "draw_date, first_prize, second_prize, third_prize, special_numbers, consolation_numbers"
      )
      .eq("operator", operator)
      .order("draw_date", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`read ${operator}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const raw of data) {
      const row = raw as DrawResultV2Read;
      const date = row.draw_date;
      if (!date) continue;
      drawCount += 1;

      if (isValid4D(row.first_prize)) record(map, row.first_prize, "first", date);
      if (isValid4D(row.second_prize)) record(map, row.second_prize, "second", date);
      if (isValid4D(row.third_prize)) record(map, row.third_prize, "third", date);

      for (const n of row.special_numbers ?? []) {
        if (isValid4D(n)) record(map, n, "special", date);
      }
      for (const n of row.consolation_numbers ?? []) {
        if (isValid4D(n)) record(map, n, "consolation", date);
      }
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  const now = new Date().toISOString();
  const rows = Array.from(map.entries()).map(([number, a]) => ({
    number,
    operator,
    total_appearances: a.total,
    first_prize_count: a.first,
    second_prize_count: a.second,
    third_prize_count: a.third,
    special_count: a.special,
    consolation_count: a.consolation,
    last_seen_date: a.lastDate,
    last_prize_type: a.lastPrizeType,
    updated_at: now,
  }));

  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from("number_stats_v2")
      .upsert(batch, { onConflict: "number,operator" });
    if (error) {
      throw new Error(`number_stats_v2 upsert (${operator}): ${error.message}`);
    }
  }

  return { draws: drawCount, stats: rows.length };
}

async function main() {
  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured (.env.local)");
    process.exit(1);
  }

  const operators = await listOperators(supabase);
  console.log(`[aggregate:v2] operators: ${operators.join(", ") || "(none)"}`);

  let totalStats = 0;
  for (const op of operators) {
    const { draws, stats } = await aggregateOperator(supabase, op);
    totalStats += stats;
    console.log(`✅ ${op}: ${draws} draws → ${stats} 条 stats 写入`);
  }

  console.log(
    `[aggregate:v2] Done. ${operators.length} operators, ${totalStats} number_stats_v2 rows total.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
