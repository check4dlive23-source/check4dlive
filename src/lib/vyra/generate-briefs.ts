import { isDrawDay, todayMYT } from "@/lib/draw-time";
import { createClient } from "@/lib/supabase/server";
import {
  enrichSignalsWithContext,
  loadLongestColdForRegion,
  loadVyraDetectInput,
} from "@/lib/vyra/data-loader";
import {
  generateBriefNarrative,
  type VyraNarrativeResult,
} from "@/lib/vyra/narrative";
import { buildBriefData } from "@/lib/vyra/signals";
import type { VyraBriefData, VyraRegion } from "@/lib/vyra/types";
import type { Region } from "@/types";

const REGION_LABELS: Record<VyraRegion, { zh: string; en: string }> = {
  west: { zh: "西马", en: "West Malaysia" },
  east: { zh: "东马", en: "East Malaysia" },
  singapore: { zh: "新加坡", en: "Singapore" },
};

const REGION_OPERATORS: Record<VyraRegion, { zh: string; en: string }> = {
  west: { zh: "万能·大马彩·多多", en: "Magnum · Da Ma Cai · Toto" },
  east: { zh: "大伯公·沙巴88·山打根", en: "Cash Sweep · Sabah 88 · STC" },
  singapore: { zh: "新加坡 Pools", en: "Singapore Pools" },
};

function regionToDrawDayRegion(r: VyraRegion): Region {
  return r;
}

function narrativeContext(
  region: VyraRegion,
  lang: "zh" | "en",
  longestCold: { number: string; draws: number } | null
) {
  return {
    region,
    regionLabel: REGION_LABELS[region][lang],
    operatorNames: REGION_OPERATORS[region][lang],
    isDrawDay: isDrawDay(regionToDrawDayRegion(region)),
    longestCold,
  };
}

async function buildEnrichedBrief(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  region: VyraRegion,
  briefDate: string
): Promise<{
  briefData: VyraBriefData;
  longestCold: { number: string; draws: number } | null;
}> {
  const input = await loadVyraDetectInput(supabase, region, briefDate);
  const base = buildBriefData(region, briefDate, input);
  const signals = enrichSignalsWithContext(
    base.signals,
    input,
    region,
    briefDate
  );
  const briefData = { ...base, signals };
  const longestCold = briefData.quiet
    ? await loadLongestColdForRegion(supabase, region)
    : null;
  return { briefData, longestCold };
}

export async function generateBriefPreview(
  region: VyraRegion,
  lang: "zh" | "en",
  date?: string
): Promise<
  | { ok: true; briefData: VyraBriefData; narrative: VyraNarrativeResult }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const briefDate = date ?? todayMYT();

  try {
    const { briefData, longestCold } = await buildEnrichedBrief(
      supabase,
      region,
      briefDate
    );
    const narrative = await generateBriefNarrative(
      briefData,
      lang,
      narrativeContext(region, lang, longestCold)
    );
    return { ok: true, briefData, narrative };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "preview failed",
    };
  }
}

export async function generateBriefForRegionLang(
  region: VyraRegion,
  lang: "zh" | "en",
  date?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const briefDate = date ?? todayMYT();

  try {
    const { briefData, longestCold } = await buildEnrichedBrief(
      supabase,
      region,
      briefDate
    );

    const narrative = await generateBriefNarrative(
      briefData,
      lang,
      narrativeContext(region, lang, longestCold)
    );

    const { error } = await supabase.from("vyra_briefs").upsert(
      {
        region,
        brief_date: briefDate,
        lang,
        signals: briefData.signals,
        quiet: briefData.quiet,
        narrative: narrative.narrative,
        intro: narrative.intro,
      },
      { onConflict: "region,brief_date,lang" }
    );

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "generate failed",
    };
  }
}

export async function generateAllBriefs(date?: string): Promise<
  Record<string, { ok: boolean; error?: string }>
> {
  const regions: VyraRegion[] = ["west", "east", "singapore"];
  const langs: ("zh" | "en")[] = ["zh", "en"];
  const results: Record<string, { ok: boolean; error?: string }> = {};

  for (const region of regions) {
    for (const lang of langs) {
      const key = `${region}/${lang}`;
      const r = await generateBriefForRegionLang(region, lang, date);
      results[key] = r.ok ? { ok: true } : { ok: false, error: r.error };
    }
  }

  return results;
}
