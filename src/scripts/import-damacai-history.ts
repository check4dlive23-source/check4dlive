/**
 * Import Damacai historical draws into draw_results_v2.
 * - Before 2005-01-01: check4d.org
 * - From 2005-01-01: damacai.com.my blob API
 * Run: npm run import:damacai
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import { upsertDrawResultsV2 } from "@/lib/draw-results-v2";
import {
  check4dSegmentEnd,
  DAMACAI_OFFICIAL_START,
  importCheck4dOperatorHistory,
  officialSegmentStart,
} from "@/lib/ingest/check4d-org-v2";
import { parseHistoryImportArgs, sleep } from "@/lib/ingest/import-args";
import {
  fetchDamacaiDrawForDate,
  fetchDamacaiPastDateYmds,
  ymdToIso,
} from "@/lib/ingest/damacai-api";

loadEnvLocal();

async function importDamacaiOfficial(
  from: string,
  to: string,
  delay: number
): Promise<{ upserted: number; skip: number; errors: string[] }> {
  const supabase = createServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  console.log(`[damacai] damacai.com.my API ${from} → ${to}`);
  const allYmds = await fetchDamacaiPastDateYmds();
  const targets = allYmds.filter((ymd) => {
    const iso = ymdToIso(ymd);
    return iso && iso >= from && iso <= to;
  });

  console.log(`[damacai] ${targets.length} API draw dates`);

  let upserted = 0;
  let skip = 0;
  const errors: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const ymd = targets[i];
    try {
      const row = await fetchDamacaiDrawForDate(ymd);
      if (!row) {
        skip += 1;
      } else {
        const result = await upsertDrawResultsV2(supabase, [row]);
        upserted += result.upserted;
        errors.push(...result.errors);
      }
    } catch (e) {
      errors.push(`${ymd}: ${e instanceof Error ? e.message : String(e)}`);
    }

    if ((i + 1) % 25 === 0 || i === targets.length - 1) {
      console.log(`[damacai] API ${i + 1}/${targets.length} upserted=${upserted}`);
    }
    if (delay > 0 && i < targets.length - 1) await sleep(delay);
  }

  return { upserted, skip, errors };
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

  console.log(`[damacai] Full import ${from} → ${to}`);
  const allErrors: string[] = [];
  let totalUpserted = 0;

  const c4d = check4dSegmentEnd(from, to, DAMACAI_OFFICIAL_START);
  if (c4d) {
    const r = await importCheck4dOperatorHistory(
      supabase,
      "damacai",
      c4d.from,
      c4d.to,
      delay,
      "damacai"
    );
    totalUpserted += r.upserted;
    allErrors.push(...r.errors);
    console.log(
      `[damacai] check4d.org done: upserted=${r.upserted} skip=${r.skip}`
    );
  }

  const official = officialSegmentStart(from, to, DAMACAI_OFFICIAL_START);
  if (official) {
    const r = await importDamacaiOfficial(official.from, official.to, delay);
    totalUpserted += r.upserted;
    allErrors.push(...r.errors);
    console.log(
      `[damacai] official API done: upserted=${r.upserted} skip=${r.skip}`
    );
  }

  console.log(
    `[damacai] Done. total upserted=${totalUpserted} errors=${allErrors.length}`
  );
  if (allErrors.length) {
    console.log(allErrors.slice(0, 20).join("\n"));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
