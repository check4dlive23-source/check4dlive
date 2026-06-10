import { createClient } from "@/lib/supabase/server";
import { scopeKeyFromUrlOperators } from "./config";
import type { NumberScoreRow } from "./compute";

/** 读取单个号码的 Score 行，无记录或出错返回 null */
export async function getNumberScore(
  number: string,
  urlOperators: string[] = []
): Promise<NumberScoreRow | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const scope = scopeKeyFromUrlOperators(urlOperators);
  let { data, error } = await supabase
    .from("number_scores")
    .select("*")
    .eq("number", number)
    .eq("scope", scope)
    .maybeSingle();
  if ((error || !data) && scope !== "all") {
    const fb = await supabase
      .from("number_scores")
      .select("*")
      .eq("number", number)
      .eq("scope", "all")
      .maybeSingle();
    data = fb.data;
    error = fb.error;
  }
  if (error || !data) return null;
  return data as NumberScoreRow;
}
