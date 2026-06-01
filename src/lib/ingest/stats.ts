import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateHeatScore } from "@/lib/heat-score";

export interface HistoryEntry {
  number: string;
  position: string;
}

function isValid4d(n: string): boolean {
  return /^\d{4}$/.test(n);
}

export function buildHistoryEntries(draw: {
  first_prize?: string | null;
  second_prize?: string | null;
  third_prize?: string | null;
  special_numbers?: string[] | null;
  consolation_numbers?: string[] | null;
}): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  if (draw.first_prize && isValid4d(draw.first_prize)) {
    entries.push({ number: draw.first_prize, position: "first" });
  }
  if (draw.second_prize && isValid4d(draw.second_prize)) {
    entries.push({ number: draw.second_prize, position: "second" });
  }
  if (draw.third_prize && isValid4d(draw.third_prize)) {
    entries.push({ number: draw.third_prize, position: "third" });
  }
  draw.special_numbers?.forEach((n, i) => {
    if (isValid4d(n)) entries.push({ number: n, position: `special_${i + 1}` });
  });
  draw.consolation_numbers?.forEach((n, i) => {
    if (isValid4d(n)) {
      entries.push({ number: n, position: `consolation_${i + 1}` });
    }
  });
  return entries;
}

export async function recordDrawStats(
  supabase: SupabaseClient,
  drawId: string,
  date: string,
  operator: string,
  entries: HistoryEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  const rows = entries.map((e) => ({
    number: e.number,
    date,
    draw_id: drawId,
    operator,
    position: e.position,
  }));

  const { error: histErr } = await supabase.from("draw_history").insert(rows);
  if (histErr) throw new Error(`draw_history: ${histErr.message}`);

  for (const entry of entries) {
    const { data: existing } = await supabase
      .from("number_stats")
      .select("*")
      .eq("number", entry.number)
      .maybeSingle();

    const pos = entry.position;
    const inc = {
      total_hits: 1,
      first_prize_hits: pos === "first" ? 1 : 0,
      second_prize_hits: pos === "second" ? 1 : 0,
      third_prize_hits: pos === "third" ? 1 : 0,
      special_hits: pos.startsWith("special") ? 1 : 0,
      consolation_hits: pos.startsWith("consolation") ? 1 : 0,
    };

    if (existing) {
      const totalHits = (existing.total_hits ?? 0) + 1;
      const currentGap = 0;
      const daysSinceFirst = Math.max(1, totalHits);

      await supabase
        .from("number_stats")
        .update({
          total_hits: totalHits,
          first_prize_hits:
            (existing.first_prize_hits ?? 0) + inc.first_prize_hits,
          second_prize_hits:
            (existing.second_prize_hits ?? 0) + inc.second_prize_hits,
          third_prize_hits:
            (existing.third_prize_hits ?? 0) + inc.third_prize_hits,
          special_hits: (existing.special_hits ?? 0) + inc.special_hits,
          consolation_hits:
            (existing.consolation_hits ?? 0) + inc.consolation_hits,
          last_seen_date: date,
          last_seen_operator: operator,
          last_seen_position: pos,
          current_gap_days: currentGap,
          heat_score: calculateHeatScore(totalHits, daysSinceFirst, currentGap),
          updated_at: new Date().toISOString(),
        })
        .eq("number", entry.number);
    } else {
      await supabase.from("number_stats").insert({
        number: entry.number,
        total_hits: 1,
        first_prize_hits: inc.first_prize_hits,
        second_prize_hits: inc.second_prize_hits,
        third_prize_hits: inc.third_prize_hits,
        special_hits: inc.special_hits,
        consolation_hits: inc.consolation_hits,
        last_seen_date: date,
        last_seen_operator: operator,
        last_seen_position: pos,
        current_gap_days: 0,
        heat_score: calculateHeatScore(1, 1, 0),
      });
    }
  }
}
