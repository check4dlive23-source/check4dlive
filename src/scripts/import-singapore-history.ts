/**
 * Import Singapore Pools 4D history → draw_results_v2
 * Source: check4d.org/past-results; falls back to 4dresult.asia when check4d.org times out
 * Run: npm run import:singapore
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import { parseHistoryImportArgs } from "@/lib/ingest/import-args";
import { importCheck4dOperatorHistory } from "@/lib/ingest/check4d-org-v2";

loadEnvLocal();

async function main() {
  const { from, to, delay } = parseHistoryImportArgs("1986-05-01");
  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured (.env.local)");
    process.exit(1);
  }

  console.log(
    `[singapore] Import ${from} → ${to} (check4d.org → 4dresult.asia fallback)`
  );
  const r = await importCheck4dOperatorHistory(
    supabase,
    "sgpools",
    from,
    to,
    delay
  );

  console.log(
    `[singapore] Done. upserted=${r.upserted} skip=${r.skip} errors=${r.errors.length}`
  );
  if (r.errors.length) {
    console.log(r.errors.slice(0, 20).join("\n"));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
