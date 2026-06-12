import {
  VYRA_REGION_SCOPE,
  VYRA_REGION_V2_OPERATORS,
  VYRA_SIGNAL_CONFIG,
} from "@/lib/vyra/config";
import type {
  VyraDetectInput,
  VyraDrawRow,
  VyraRegion,
  VyraScoreRow,
  VyraSnapshotRow,
} from "@/lib/vyra/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

async function fetchRegionDraws(
  supabase: SupabaseClient,
  operators: readonly string[],
  since?: string
): Promise<VyraDrawRow[]> {
  const pageSize = 1000;
  let page = 0;
  const out: VyraDrawRow[] = [];

  while (true) {
    let q = supabase
      .from("draw_results_v2")
      .select(
        "draw_date, operator, first_prize, second_prize, third_prize, special_numbers, consolation_numbers"
      )
      .in("operator", [...operators])
      .order("draw_date", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (since) q = q.gte("draw_date", since);

    const { data, error } = await q;
    if (error) throw new Error(`draw_results_v2: ${error.message}`);
    if (!data?.length) break;
    out.push(...(data as VyraDrawRow[]));
    if (data.length < pageSize) break;
    page++;
  }
  return out;
}

export async function loadVyraDetectInput(
  supabase: SupabaseClient,
  region: VyraRegion,
  date: string
): Promise<VyraDetectInput> {
  const operators = VYRA_REGION_V2_OPERATORS[region];
  const scope = VYRA_REGION_SCOPE[region];
  const lookback = Math.max(
    VYRA_SIGNAL_CONFIG.mirrorSync.windowDays,
    VYRA_SIGNAL_CONFIG.digitSurge.windowDays
  );
  const recentSince = addDays(date, -(lookback - 1));

  const [drawsHistory, drawsRecent, scoresRes, snapTodayRes, snapPastRes] =
    await Promise.all([
      fetchRegionDraws(supabase, operators),
      fetchRegionDraws(supabase, operators, recentSince),
      supabase
        .from("number_scores")
        .select("number, scope, total_hits, current_gap_days, avg_gap_days")
        .eq("scope", scope),
      supabase
        .from("score_snapshots")
        .select("snapshot_date, number, overall_score")
        .eq("snapshot_date", date),
      supabase
        .from("score_snapshots")
        .select("snapshot_date, number, overall_score")
        .eq("snapshot_date", addDays(date, -VYRA_SIGNAL_CONFIG.scoreJump.windowDays)),
    ]);

  if (scoresRes.error) throw new Error(`number_scores: ${scoresRes.error.message}`);
  if (snapTodayRes.error) throw new Error(`score_snapshots today: ${snapTodayRes.error.message}`);
  if (snapPastRes.error) throw new Error(`score_snapshots past: ${snapPastRes.error.message}`);

  return {
    drawsRecent,
    drawsHistory,
    scores: (scoresRes.data ?? []) as VyraScoreRow[],
    snapshotsToday: (snapTodayRes.data ?? []) as VyraSnapshotRow[],
    snapshotsWeekAgo: (snapPastRes.data ?? []) as VyraSnapshotRow[],
  };
}

export async function loadLongestColdForRegion(
  supabase: SupabaseClient,
  region: VyraRegion
): Promise<{ number: string; days: number } | null> {
  const scope = VYRA_REGION_SCOPE[region];
  const { data, error } = await supabase
    .from("number_scores")
    .select("number, current_gap_days")
    .eq("scope", scope)
    .not("current_gap_days", "is", null)
    .order("current_gap_days", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.number || data.current_gap_days == null) return null;
  return { number: data.number as string, days: data.current_gap_days as number };
}
