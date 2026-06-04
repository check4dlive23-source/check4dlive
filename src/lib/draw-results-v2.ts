import type { SupabaseClient } from "@supabase/supabase-js";

export interface DrawResultV2Row {
  draw_date: string;
  draw_no?: string | null;
  operator: string;
  first_prize?: string | null;
  second_prize?: string | null;
  third_prize?: string | null;
  special_numbers?: string[] | null;
  consolation_numbers?: string[] | null;
  extra_data?: Record<string, unknown> | null;
  source: string;
}

export async function upsertDrawResultsV2(
  supabase: SupabaseClient,
  rows: DrawResultV2Row[]
): Promise<{ upserted: number; errors: string[] }> {
  const errors: string[] = [];
  let upserted = 0;

  for (const row of rows) {
    const { error } = await supabase.from("draw_results_v2").upsert(
      {
        draw_date: row.draw_date,
        draw_no: row.draw_no ?? null,
        operator: row.operator,
        first_prize: row.first_prize ?? null,
        second_prize: row.second_prize ?? null,
        third_prize: row.third_prize ?? null,
        special_numbers: row.special_numbers ?? null,
        consolation_numbers: row.consolation_numbers ?? null,
        extra_data: row.extra_data ?? null,
        source: row.source,
      },
      { onConflict: "draw_date,operator", ignoreDuplicates: false }
    );

    if (error) {
      errors.push(`${row.operator} ${row.draw_date}: ${error.message}`);
    } else {
      upserted += 1;
    }
  }

  return { upserted, errors };
}
