/**
 * Daily maintenance ingest (Vercel cron 00:05 MYT).
 * Persists completed draws + draw_history + number_stats.
 * Live draw updates use /api/results scrape path — not this job.
 */
import { createServerClient } from "@/lib/supabase/server";
import {
  fetchAllCheck4dDraws,
  type ParsedWestDraw,
} from "@/lib/ingest/parse-check4d";
import { buildHistoryEntries, recordDrawStats } from "@/lib/ingest/stats";

export interface IngestResult {
  success: boolean;
  inserted: number;
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
      operators: [],
      errors: ["Supabase not configured"],
    };
  }

  const parsed = await fetchAllCheck4dDraws();
  const errors: string[] = [];
  let inserted = 0;
  const operators: string[] = [];

  for (const draw of parsed) {
    if (
      !draw.first_prize ||
      draw.first_prize === "----" ||
      !/^\d{4}$/.test(draw.first_prize)
    ) {
      continue;
    }

    try {
      const { data: row, error } = await supabase
        .from("draws")
        .insert(toDbRow(draw))
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      if (!row?.id) throw new Error("No draw id returned");

      const entries = buildHistoryEntries(draw);
      await recordDrawStats(
        supabase,
        row.id,
        draw.date,
        draw.operator,
        entries
      );

      inserted += 1;
      operators.push(draw.operator);
    } catch (e) {
      errors.push(
        `${draw.operator}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return {
    success: errors.length === 0,
    inserted,
    operators,
    errors: errors.length ? errors : undefined,
  };
}
