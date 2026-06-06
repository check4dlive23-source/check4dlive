import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrawResultV2Row } from "@/lib/draw-results-v2";
import { upsertDrawResultsV2 } from "@/lib/draw-results-v2";
import { sleep } from "@/lib/ingest/import-args";

export async function batchUpsertDrawResults(
  supabase: SupabaseClient,
  rows: DrawResultV2Row[],
  batchSize = 50,
  label = "import"
): Promise<{ upserted: number; errors: string[] }> {
  let upserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const result = await upsertDrawResultsV2(supabase, batch);
    upserted += result.upserted;
    errors.push(...result.errors);
    console.log(`[${label}] batch ${Math.floor(i / batchSize) + 1}: +${result.upserted}`);
  }

  return { upserted, errors };
}

export async function upsertWithDelay(
  supabase: SupabaseClient,
  row: DrawResultV2Row | null,
  delay: number
): Promise<{ upserted: number; error?: string }> {
  if (!row) return { upserted: 0 };
  const { upserted, errors } = await upsertDrawResultsV2(supabase, [row]);
  if (delay > 0) await sleep(delay);
  return { upserted, error: errors[0] };
}
