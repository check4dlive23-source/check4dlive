/**
 * Import Sports Toto 4D history → draw_results_v2
 * Source: sportstoto.com.my/results_past.asp + results_past_print.asp
 * Run: npm run import:toto
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import { parseHistoryImportArgs, sleep } from "@/lib/ingest/import-args";
import { upsertWithDelay } from "@/lib/ingest/historical-import";
import {
  fetchTotoDrawByNo,
  listTotoDrawNosForYear,
  yearsInRange,
} from "@/lib/ingest/toto-api";

loadEnvLocal();

async function main() {
  const { from, to, delay } = parseHistoryImportArgs("1989-01-01");
  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured (.env.local)");
    process.exit(1);
  }

  console.log(`[toto] Import ${from} → ${to}`);
  const years = yearsInRange(from, to);
  const drawNos: string[] = [];

  for (const year of years) {
    try {
      const nos = await listTotoDrawNosForYear(year);
      drawNos.push(...nos);
      console.log(`[toto] ${year}: ${nos.length} draws listed`);
    } catch (e) {
      console.error(`[toto] ${year} list failed:`, e);
    }
    if (delay > 0) await sleep(delay);
  }

  const unique = Array.from(new Set(drawNos));
  console.log(`[toto] ${unique.length} unique draw numbers to fetch`);

  let upserted = 0;
  let skip = 0;
  const errors: string[] = [];

  for (let i = 0; i < unique.length; i++) {
    const drawNo = unique[i];
    try {
      const row = await fetchTotoDrawByNo(drawNo);
      if (!row || row.draw_date < from || row.draw_date > to) {
        skip += 1;
      } else {
        const r = await upsertWithDelay(supabase, row, 0);
        upserted += r.upserted;
        if (r.error) errors.push(`${drawNo}: ${r.error}`);
      }
    } catch (e) {
      errors.push(`${drawNo}: ${e instanceof Error ? e.message : String(e)}`);
    }

    if ((i + 1) % 25 === 0 || i === unique.length - 1) {
      console.log(`[toto] ${i + 1}/${unique.length} upserted=${upserted} skip=${skip}`);
    }
    if (delay > 0 && i < unique.length - 1) await sleep(delay);
  }

  console.log(`[toto] Done. upserted=${upserted} skip=${skip} errors=${errors.length}`);
  if (errors.length) {
    console.log(errors.slice(0, 20).join("\n"));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
