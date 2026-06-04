/**
 * Import Magnum historical draws into draw_results_v2.
 * Uses Magnum JSON API /results/past/between-dates (falls back to __NEXT_DATA__ scan).
 * Run: npx tsx src/scripts/import-magnum-history.ts
 * Optional: --from=2021-01-01 --to=2026-06-04
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import { upsertDrawResultsV2 } from "@/lib/draw-results-v2";
import {
  fetchMagnumDrawsBetween,
  parseMagnumDraw,
} from "@/lib/ingest/magnum-api";

loadEnvLocal();

function parseArgs() {
  const today = new Date().toISOString().slice(0, 10);
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  let from = fiveYearsAgo.toISOString().slice(0, 10);
  let to = today;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--from=")) from = arg.slice(7);
    else if (arg.startsWith("--to=")) to = arg.slice(5);
  }
  return { from, to };
}

async function main() {
  const { from, to } = parseArgs();
  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured (.env.local)");
    process.exit(1);
  }

  console.log(`[magnum] Fetching draws ${from} → ${to}`);
  const raw = await fetchMagnumDrawsBetween(from, to, 1200);
  const rows = raw
    .map((r) => parseMagnumDraw(r))
    .filter((r): r is NonNullable<typeof r> => r != null)
    .filter((r) => r.draw_date >= from && r.draw_date <= to);

  console.log(`[magnum] Parsed ${rows.length} draws`);

  const BATCH = 50;
  let upserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const result = await upsertDrawResultsV2(supabase, batch);
    upserted += result.upserted;
    errors.push(...result.errors);
    console.log(`[magnum] batch ${i / BATCH + 1}: +${result.upserted}`);
  }

  console.log(`[magnum] Done. upserted=${upserted} errors=${errors.length}`);
  if (errors.length) {
    console.log(errors.slice(0, 20).join("\n"));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
