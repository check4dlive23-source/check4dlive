/**
 * Import Magnum historical draws into draw_results_v2.
 * - Before 2018-10-17: check4d.org (archive back to ~1985)
 * - From 2018-10-17: magnum4d.my JSON API
 * Run: npm run import:magnum
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import { upsertDrawResultsV2 } from "@/lib/draw-results-v2";
import {
  check4dSegmentEnd,
  importCheck4dOperatorHistory,
  MAGNUM_OFFICIAL_START,
  officialSegmentStart,
} from "@/lib/ingest/check4d-org-v2";
import { parseHistoryImportArgs } from "@/lib/ingest/import-args";
import {
  fetchMagnumDrawsBetween,
  parseMagnumDraw,
} from "@/lib/ingest/magnum-api";

loadEnvLocal();

async function importMagnumOfficial(
  from: string,
  to: string
): Promise<{ upserted: number; errors: string[] }> {
  const supabase = createServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  console.log(`[magnum] magnum4d.my API ${from} → ${to}`);
  const raw = await fetchMagnumDrawsBetween(from, to, 1200);
  const rows = raw
    .map((r) => parseMagnumDraw(r))
    .filter((r): r is NonNullable<typeof r> => r != null)
    .filter((r) => r.draw_date >= from && r.draw_date <= to);

  console.log(`[magnum] API parsed ${rows.length} draws`);

  const BATCH = 50;
  let upserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const result = await upsertDrawResultsV2(supabase, batch);
    upserted += result.upserted;
    errors.push(...result.errors);
    console.log(`[magnum] API batch ${Math.floor(i / BATCH) + 1}: +${result.upserted}`);
  }

  return { upserted, errors };
}

async function main() {
  const { from, to, delay } = parseHistoryImportArgs(
    new Date(new Date().setFullYear(new Date().getFullYear() - 5))
      .toISOString()
      .slice(0, 10)
  );
  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured (.env.local)");
    process.exit(1);
  }

  console.log(`[magnum] Full import ${from} → ${to}`);
  const allErrors: string[] = [];
  let totalUpserted = 0;

  const c4d = check4dSegmentEnd(from, to, MAGNUM_OFFICIAL_START);
  if (c4d) {
    const r = await importCheck4dOperatorHistory(
      supabase,
      "magnum",
      c4d.from,
      c4d.to,
      delay,
      "magnum"
    );
    totalUpserted += r.upserted;
    allErrors.push(...r.errors);
    console.log(
      `[magnum] check4d.org done: upserted=${r.upserted} skip=${r.skip}`
    );
  }

  const official = officialSegmentStart(from, to, MAGNUM_OFFICIAL_START);
  if (official) {
    const r = await importMagnumOfficial(official.from, official.to);
    totalUpserted += r.upserted;
    allErrors.push(...r.errors);
    console.log(`[magnum] official API done: upserted=${r.upserted}`);
  }

  console.log(`[magnum] Done. total upserted=${totalUpserted} errors=${allErrors.length}`);
  if (allErrors.length) {
    console.log(allErrors.slice(0, 20).join("\n"));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
