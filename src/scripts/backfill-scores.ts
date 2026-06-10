/**
 * 全量回填 number_scores：
 * 读 draw_results_v2 全部期数 → 展开每期号码 → 聚合 → computeAllScores → upsert。
 * 模式照抄 aggregate-stats-v2.ts（分页读 1000 / 分批写 500）。
 * Run: npm run backfill:scores
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import {
  computeAllScores,
  type NumberAggregate,
} from "@/lib/score/compute";

loadEnvLocal();

const PAGE = 1000;
const UPSERT_BATCH = 500;

interface DrawRow {
  draw_date: string;
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

  const acc = new Map<string, Acc>();

  function record(num: unknown, drawDate: string) {
    if (!isValid4D(num)) return;
    let a = acc.get(num);
    if (!a) {
      a = { totalHits: 0, hits30d: 0, hits90d: 0, hits365d: 0, dates: new Set() };
      acc.set(num, a);
    }
    a.totalHits += 1;
    if (drawDate >= d30) a.hits30d += 1;
    if (drawDate >= d90) a.hits90d += 1;
    if (drawDate >= d365) a.hits365d += 1;
    a.dates.add(drawDate);
  }

  // 分页读全部期数（不按运营商分，跨运营商合并口径）
  let from = 0;
  let totalDraws = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("draw_results_v2")
      .select(
        "draw_date, first_prize, second_prize, third_prize, special_numbers, consolation_numbers"
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
      record(row.first_prize, date);
      record(row.second_prize, date);
      record(row.third_prize, date);
      for (const n of row.special_numbers ?? []) record(n, date);
      for (const n of row.consolation_numbers ?? []) record(n, date);
    }
    totalDraws += data.length;
    console.log(`Read ${totalDraws} draws...`);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Total draws: ${totalDraws}, distinct numbers: ${acc.size}`);

  // 转 NumberAggregate
  const aggregates: NumberAggregate[] = Array.from(acc.entries()).map(
    ([number, a]) => ({
      number,
      totalHits: a.totalHits,
      hits30d: a.hits30d,
      hits90d: a.hits90d,
      hits365d: a.hits365d,
      uniqueDates: Array.from(a.dates).sort(),
    })
  );

  const rows = computeAllScores(aggregates, today);
  console.log(`Computed ${rows.length} score rows. Upserting...`);

  let written = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH).map((r) => ({
      ...r,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("number_scores")
      .upsert(batch, { onConflict: "number" });
    if (error) {
      console.error(`Upsert error at batch ${i}:`, error.message);
      process.exit(1);
    }
    written += batch.length;
    console.log(`Upserted ${written}/${rows.length}`);
  }

  console.log("Backfill complete.");
}

main();
