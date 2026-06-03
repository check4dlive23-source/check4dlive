/**
 * Daily maintenance ingest (Vercel cron 00:05 MYT).
 * Persists latest check4dresult draws for fallback (all regions, any prize state).
 * Live draw updates use live-ingest cron — not this job.
 */
import { createServerClient } from "@/lib/supabase/server";
import {
  fetchAllCheck4dDraws,
  type ParsedWestDraw,
} from "@/lib/ingest/parse-check4d";
import { buildHistoryEntries, recordDrawStats } from "@/lib/ingest/stats";
import type { Region } from "@/types";

export const INGEST_REGIONS: Region[] = [
  "west",
  "east",
  "cambodia",
  "singapore",
];

export interface IngestResult {
  success: boolean;
  inserted: number;
  regions: Region[];
  operators: string[];
  errors?: string[];
}

function toDbRow(draw: ParsedWestDraw) {
  return {
    date: draw.date,
    draw_no: draw.draw_no ?? null,
    operator: draw.operator,
    region: draw.region,
    first_prize: draw.first_prize ?? null,
    second_prize: draw.second_prize ?? null,
    third_prize: draw.third_prize ?? null,
    special_numbers: draw.special_numbers,
    consolation_numbers: draw.consolation_numbers,
    jackpot1_amount: draw.jackpot1_amount,
    jackpot2_amount: draw.jackpot2_amount,
    zodiac: draw.zodiac ?? null,
    extra_data: draw.extra_data ?? null,
  };
}

export async function runIngest(): Promise<IngestResult> {
  const supabase = createServerClient();
  if (!supabase) {
    return {
      success: false,
      inserted: 0,
      regions: INGEST_REGIONS,
      operators: [],
      errors: ["Supabase not configured"],
    };
  }

  const parsed = await fetchAllCheck4dDraws();
  const errors: string[] = [];
  let inserted = 0;
  const operators: string[] = [];

  for (const draw of parsed) {
    if (!draw.date || !INGEST_REGIONS.includes(draw.region)) {
      continue;
    }
    if (!draw.first_prize || draw.first_prize === "") {
      continue;
    }

    try {
      const { data: row, error } = await supabase
        .from("draws")
        .upsert(toDbRow(draw), {
          onConflict: "operator,date",
          ignoreDuplicates: false,
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      if (!row?.id) throw new Error("No draw id returned");

      const hasValidPrize =
        draw.first_prize != null && /^\d{4}$/.test(draw.first_prize);
      if (hasValidPrize) {
        const entries = buildHistoryEntries(draw);
        await recordDrawStats(
          supabase,
          row.id,
          draw.date,
          draw.operator,
          entries
        );
      }

      inserted += 1;
      operators.push(`${draw.region}/${draw.operator}:${draw.date}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const label = `${draw.operator} ${draw.date}`;
      console.error(`[ingest] ${label}:`, e);
      errors.push(`${label}: ${msg}`);
    }
  }

  return {
    success: errors.length === 0,
    inserted,
    regions: INGEST_REGIONS,
    operators,
    errors: errors.length ? errors : undefined,
  };
}
