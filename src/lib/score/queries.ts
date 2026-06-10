import { createClient } from "@/lib/supabase/server";
import type { NumberScoreRow } from "./compute";

/** 读取单个号码的 Score 行，无记录或出错返回 null */
export async function getNumberScore(
  number: string
): Promise<NumberScoreRow | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("number_scores")
    .select("*")
    .eq("number", number)
    .maybeSingle();
  if (error || !data) return null;
  return data as NumberScoreRow;
}
