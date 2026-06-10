/**
 * Import Singapore Pools 4D history directly from singaporepools.com.sg
 * Run: npm run import:singapore:official
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import { fetchSgDrawList, fetchSingaporeDraw } from "@/lib/ingest/singapore-api";
import { upsertDrawResultsV2 } from "@/lib/draw-results-v2";
import { sleep } from "@/lib/ingest/import-args";

loadEnvLocal();

async function main() {
  const fromArg = process.argv.find((a) => a.startsWith("--from="))?.split("=")[1];
  const toArg = process.argv.find((a) => a.startsWith("--to="))?.split("=")[1];
  const delayArg = process.argv.find((a) => a.startsWith("--delay="))?.split("=")[1];
  const delay = delayArg ? parseInt(delayArg) : 500;

  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured");
    process.exit(1);
  }

  console.log("[singapore-official] Fetching draw list from singaporepools.com.sg...");
  const allDraws = await fetchSgDrawList();
  console.log(`[singapore-official] Found ${allDraws.length} draws`);

  // 按日期过滤
  const filtered = allDraws.filter((ref) => {
    if (fromArg && ref.drawDate < fromArg) return false;
    if (toArg && ref.drawDate > toArg) return false;
    return true;
  });

  console.log(`[singapore-official] Importing ${filtered.length} draws (${fromArg ?? "all"} → ${toArg ?? "latest"})`);

  let upserted = 0;
  let skip = 0;
  const errors: string[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const ref = filtered[i];
    try {
      const row = await fetchSingaporeDraw(ref);
      if (!row) {
        skip++;
      } else {
        const result = await upsertDrawResultsV2(supabase, [row]);
        upserted += result.upserted;
        errors.push(...result.errors);
      }
    } catch (e) {
      errors.push(`${ref.drawDate}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if ((i + 1) % 25 === 0) {
      console.log(`[singapore-official] ${i + 1}/${filtered.length} done, upserted=${upserted}`);
    }
    if (delay > 0) await sleep(delay);
  }

  console.log(`[singapore-official] Done. upserted=${upserted} skip=${skip} errors=${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 20).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
