import { todayMYT } from "@/lib/draw-time";
import { createClient } from "@/lib/supabase/server";
import type { VyraSignal } from "@/lib/vyra/types";
import type { VyraRegion } from "@/lib/vyra/types";

export interface VyraBriefRow {
  region: VyraRegion;
  brief_date: string;
  lang: "zh" | "en";
  signals: VyraSignal[];
  quiet: boolean;
  narrative: { signalIndex: number; text: string }[];
  intro: string | null;
  created_at?: string;
}

export async function fetchVyraBrief(
  region: VyraRegion,
  lang: "zh" | "en",
  date?: string
): Promise<VyraBriefRow | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const targetDate = date ?? todayMYT();

  const { data: todayRow } = await supabase
    .from("vyra_briefs")
    .select("*")
    .eq("region", region)
    .eq("lang", lang)
    .eq("brief_date", targetDate)
    .maybeSingle();

  if (todayRow) return todayRow as VyraBriefRow;

  const { data: latest } = await supabase
    .from("vyra_briefs")
    .select("*")
    .eq("region", region)
    .eq("lang", lang)
    .order("brief_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest ? (latest as VyraBriefRow) : null;
}

export async function fetchVyraBriefsByRegion(): Promise<
  Record<VyraRegion, { zh: VyraBriefRow | null; en: VyraBriefRow | null }>
> {
  const regions: VyraRegion[] = ["west", "east", "singapore"];
  const entries = await Promise.all(
    regions.map(async (r) => {
      const [zh, en] = await Promise.all([
        fetchVyraBrief(r, "zh"),
        fetchVyraBrief(r, "en"),
      ]);
      return [r, { zh, en }] as const;
    })
  );
  return Object.fromEntries(entries) as Record<
    VyraRegion,
    { zh: VyraBriefRow | null; en: VyraBriefRow | null }
  >;
}
