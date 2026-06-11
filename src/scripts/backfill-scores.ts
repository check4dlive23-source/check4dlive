/**
 * 全量回填 number_scores（127 scope × 10,000 号码）：
 * 读 draw_results_v2 按单运营商分桶 → 126 组合 + all 合并 → computeAllScores → upsert。
 * Run: npm run backfill:scores
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import { V2_OPERATORS } from "@/lib/score/config";
import {
  computeAllScores,
  type NumberAggregate,
  type NumberScoreRow,
} from "@/lib/score/compute";

loadEnvLocal();

const PAGE = 1000;
const UPSERT_BATCH = 500;

const V2_OP_SET = new Set<string>(V2_OPERATORS);

interface DrawRow {
  draw_date: string;
  operator: string;
  first_prize: string | null;
  second_prize: string | null;
  third_prize: string | null;
  special_numbers: string[] | null;
  consolation_numbers: string[] | null;
}

interface Acc {
  totalHits: number;
  hits30d: number;
  hits90d: number;
  hits365d: number;
  dates: Set<string>;
}

function isValid4D(n: unknown): n is string {
  return typeof n === "string" && /^\d{4}$/.test(n);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function allCombos(ops: readonly string[]): string[][] {
  const out: string[][] = [];
  const n = ops.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const combo: string[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) combo.push(ops[i]);
    out.push(combo);
  }
  return out;
}

function accMapToAggregates(merged: Map<string, Acc>): NumberAggregate[] {
  return Array.from(merged.entries()).map(([number, a]) => ({
    number,
    totalHits: a.totalHits,
    hits30d: a.hits30d,
    hits90d: a.hits90d,
    hits365d: a.hits365d,
    uniqueDates: Array.from(a.dates).sort(),
  }));
}

function mergeBuckets(
  accByOp: Map<string, Map<string, Acc>>,
  opsInScope: string[]
): Map<string, Acc> {
  const merged = new Map<string, Acc>();
  for (const op of opsInScope) {
    const bucket = accByOp.get(op);
    if (!bucket) continue;
    for (const [num, a] of Array.from(bucket.entries())) {
      let m = merged.get(num);
      if (!m) {
        m = {
          totalHits: 0,
          hits30d: 0,
          hits90d: 0,
          hits365d: 0,
          dates: new Set(),
        };
        merged.set(num, m);
      }
      m.totalHits += a.totalHits;
      m.hits30d += a.hits30d;
      m.hits90d += a.hits90d;
      m.hits365d += a.hits365d;
      for (const d of Array.from(a.dates)) m.dates.add(d);
    }
  }
  return merged;
}

async function upsertScopeRows(
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
  scope: string,
  rows: NumberScoreRow[]
): Promise<void> {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH).map((r) => ({
      ...r,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("number_scores")
      .upsert(batch, { onConflict: "number,scope" });
    if (error) {
      console.error(
        `Upsert error scope=${scope} batch=${i}:`,
        error.message
      );
      process.exit(1);
    }
  }
  console.log(`[${scope}] ${rows.length} rows upserted`);
}

async function main() {
  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase client unavailable");
    process.exit(1);
  }

  const today = new Date().toISOString().split("T")[0];
  const d30 = daysAgoISO(30);
  const d90 = daysAgoISO(90);
  const d365 = daysAgoISO(365);

  const accByOp = new Map<string, Map<string, Acc>>();
  for (const op of V2_OPERATORS) accByOp.set(op, new Map());

  function record(op: string, num: unknown, drawDate: string) {
    if (!V2_OP_SET.has(op) || !isValid4D(num)) return;
    const acc = accByOp.get(op)!;
    let a = acc.get(num);
    if (!a) {
      a = {
        totalHits: 0,
        hits30d: 0,
        hits90d: 0,
        hits365d: 0,
        dates: new Set(),
      };
      acc.set(num, a);
    }
    a.totalHits += 1;
    if (drawDate >= d30) a.hits30d += 1;
    if (drawDate >= d90) a.hits90d += 1;
    if (drawDate >= d365) a.hits365d += 1;
    a.dates.add(drawDate);
  }

  let from = 0;
  let totalDraws = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("draw_results_v2")
      .select(
        "draw_date, operator, first_prize, second_prize, third_prize, special_numbers, consolation_numbers"
      )
      .order("draw_date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("Read error:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    for (const row of data as DrawRow[]) {
      const date = row.draw_date;
      const op = row.operator;
      record(op, row.first_prize, date);
      record(op, row.second_prize, date);
      record(op, row.third_prize, date);
      for (const n of row.special_numbers ?? []) record(op, n, date);
      for (const n of row.consolation_numbers ?? []) record(op, n, date);
    }
    totalDraws += data.length;
    console.log(`Read ${totalDraws} draws...`);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const distinctTotal = new Set<string>();
  for (const bucket of Array.from(accByOp.values())) {
    for (const num of Array.from(bucket.keys())) distinctTotal.add(num);
  }
  console.log(
    `Total draws: ${totalDraws}, distinct numbers (union): ${distinctTotal.size}`
  );

  const combosToProcess: (string[] | null)[] = [
    ...allCombos(V2_OPERATORS).filter(
      (c) => c.length !== V2_OPERATORS.length
    ),
    null,
  ];
  console.log(`Processing ${combosToProcess.length} scopes...`);

  for (const combo of combosToProcess) {
    const scope = combo === null ? "all" : [...combo].sort().join("+");
    const opsInScope = combo === null ? [...V2_OPERATORS] : combo;
    const merged = mergeBuckets(accByOp, opsInScope);
    const aggregates = accMapToAggregates(merged);
    const rows = computeAllScores(aggregates, today, scope);
    await upsertScopeRows(supabase, scope, rows);

    if (scope === "all") {
      const snapshotRows = rows.map((r) => ({
        snapshot_date: today,
        number: r.number,
        overall_score: r.overall_score,
        freq_score: r.freq_score,
        cycle_score: r.cycle_score,
        momentum_score: r.momentum_score,
        mirror_score: r.mirror_score,
      }));
      for (let i = 0; i < snapshotRows.length; i += UPSERT_BATCH) {
        const batch = snapshotRows.slice(i, i + UPSERT_BATCH);
        const { error: snapErr } = await supabase
          .from("score_snapshots")
          .upsert(batch, { onConflict: "snapshot_date,number" });
        if (snapErr) {
          console.error("Snapshot upsert error:", snapErr.message);
          process.exit(1);
        }
      }
      console.log(`[snapshot] ${snapshotRows.length} rows for ${today}`);
    }
  }

  console.log("Backfill complete.");
}

main();
