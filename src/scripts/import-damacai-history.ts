/**
 * Import Damacai historical draws into draw_results_v2.
 * Run: npx tsx src/scripts/import-damacai-history.ts
 * Optional: --from=2021-01-01 --to=2026-06-04 --delay=250
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import { upsertDrawResultsV2 } from "@/lib/draw-results-v2";
import {
  fetchDamacaiDrawForDate,
  fetchDamacaiPastDateYmds,
  ymdToIso,
} from "@/lib/ingest/damacai-api";

loadEnvLocal();

function parseArgs() {
  const today = new Date().toISOString().slice(0, 10);
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  let from = fiveYearsAgo.toISOString().slice(0, 10);
  let to = today;
  let delay = 250;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--from=")) from = arg.slice(7);
    else if (arg.startsWith("--to=")) to = arg.slice(5);
    else if (arg.startsWith("--delay=")) delay = Number(arg.slice(8)) || 250;
  }
  return { from, to, delay };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { from, to, delay } = parseArgs();
  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured (.env.local)");
    process.exit(1);
  }

  console.log(`[damacai] Listing dates, import range ${from} → ${to}`);
  const allYmds = await fetchDamacaiPastDateYmds();
  const targets = allYmds.filter((ymd) => {
    const iso = ymdToIso(ymd);
    return iso && iso >= from && iso <= to;
  });

  console.log(`[damacai] ${targets.length} draw dates to import`);

  let ok = 0;
  let skip = 0;
  const errors: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const ymd = targets[i];
    try {
      const row = await fetchDamacaiDrawForDate(ymd);
      if (!row) {
        skip += 1;
      } else {
        const { upserted, errors: upsertErrs } = await upsertDrawResultsV2(
          supabase,
          [row]
        );
        ok += upserted;
        errors.push(...upsertErrs);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${ymd}: ${msg}`);
    }

    if ((i + 1) % 25 === 0 || i === targets.length - 1) {
      console.log(`[damacai] ${i + 1}/${targets.length} upserted=${ok} skip=${skip}`);
    }
    if (delay > 0 && i < targets.length - 1) await sleep(delay);
  }

  console.log(`[damacai] Done. upserted=${ok} skipped=${skip} errors=${errors.length}`);
  if (errors.length) {
    console.log(errors.slice(0, 20).join("\n"));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
