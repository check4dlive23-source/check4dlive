import { createClient } from "@/lib/supabase/server";

export interface ScoreTrendPoint {
  snapshot_date: string;
  overall_score: number;
  freq_score: number;
  cycle_score: number;
  momentum_score: number;
  mirror_score: number;
}

/** 取一个号码最近 N 天的快照(升序),供变化计算与趋势图 */
export async function getScoreTrend(
  number: string,
  days = 30
): Promise<ScoreTrendPoint[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("score_snapshots")
    .select(
      "snapshot_date, overall_score, freq_score, cycle_score, momentum_score, mirror_score"
    )
    .eq("number", number)
    .gte("snapshot_date", since.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });
  return (data as ScoreTrendPoint[]) ?? [];
}

/** 7日变化:今天最新快照 vs ≥7天前最近的一条;数据不足返回 null */
export function weeklyDelta(trend: ScoreTrendPoint[]): number | null {
  if (trend.length < 2) return null;
  const latest = trend[trend.length - 1];
  const sevenDaysAgo = new Date(latest.snapshot_date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split("T")[0];
  let base = trend[0];
  for (const p of trend) {
    if (p.snapshot_date <= cutoff) base = p;
    else break;
  }
  if (base.snapshot_date === latest.snapshot_date) return null;
  return latest.overall_score - base.overall_score;
}
