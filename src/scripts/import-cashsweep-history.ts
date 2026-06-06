/**
 * Import Cash Sweep (Sarawak) 4D history → draw_results_v2
 * Source: check4d.org/past-results (official sites often unavailable)
 * Run: npm run import:cashsweep
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseHistoryImportArgs,
  sleep,
  iterDates,
  isMytDrawDay,
} from "@/lib/ingest/import-args";
import { fetchCheck4dOperatorDraw } from "@/lib/ingest/check4d-org-v2";
import { upsertWithDelay } from "@/lib/ingest/historical-import";

loadEnvLocal();

async function main() {
  const { from, to, delay } = parseHistoryImportArgs("1990-01-01");
  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured (.env.local)");
    process.exit(1);
  }

  console.log(`[cashsweep] Import ${from} → ${to} via check4d.org`);
  let upserted = 0;
  let skip = 0;
  const errors: string[] = [];
  let n = 0;

  for (const date of iterDates(from, to)) {
    if (!isMytDrawDay(date)) continue;
    n++;
    try {
      const row = await fetchCheck4dOperatorDraw(date, "sarawak");
      if (!row) skip += 1;
      else {
        const r = await upsertWithDelay(supabase, row, 0);
        upserted += r.upserted;
        if (r.error) errors.push(`${date}: ${r.error}`);
      }
    } catch (e) {
      errors.push(`${date}: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (n % 25 === 0) {
      console.log(`[cashsweep] ${n} draw days, upserted=${upserted}`);
    }
    if (delay > 0) await sleep(delay);
  }

  console.log(`[cashsweep] Done. upserted=${upserted} skip=${skip} errors=${errors.length}`);
  if (errors.length) {
    console.log(errors.slice(0, 20).join("\n"));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
