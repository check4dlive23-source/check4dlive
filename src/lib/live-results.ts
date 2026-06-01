import { createClient } from "@/lib/supabase/server";
import {
  isRegionLiveDraw,
  LIVE_CACHE_MS,
  shouldScrapeOnLive,
  todayMYT,
} from "@/lib/draw-time";
import {
  fetchAllCheck4dDraws,
  type ParsedWestDraw,
} from "@/lib/ingest/parse-check4d";
import type { Region } from "@/types";

export type DrawRow = Record<string, unknown>;

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

/** Scrape check4dresult.com and return operators for the requested region */
export async function scrapeLiveResults(
  region: Region
): Promise<Record<string, DrawRow>> {
  const parsed = (await fetchAllCheck4dDraws()).filter(
    (d) => d.region === region
  );

  const operators: Record<string, DrawRow> = {};
  for (const draw of parsed) {
    if (!draw.first_prize || draw.first_prize === "----") continue;
    operators[draw.operator] = {
      ...toDbRow(draw),
      id: `live-${draw.operator}`,
      created_at: new Date().toISOString(),
    };
  }
  return operators;
}

export async function isLiveCacheFresh(
  region: Region,
  date: string
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from("draws")
    .select("created_at")
    .eq("region", region)
    .eq("date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.created_at) return false;
  const age = Date.now() - new Date(data.created_at as string).getTime();
  return age < LIVE_CACHE_MS;
}

/** Replace today's draws per operator (live upsert) */
export async function upsertDrawResults(
  operators: Record<string, DrawRow>,
  date: string,
  region: Region
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  for (const [operator, row] of Object.entries(operators)) {
    await supabase
      .from("draws")
      .delete()
      .eq("region", region)
      .eq("operator", operator)
      .eq("date", date);

    const { error } = await supabase.from("draws").insert({
      date: (row.date as string) ?? date,
      draw_no: row.draw_no ?? null,
      operator,
      region,
      first_prize: row.first_prize ?? null,
      second_prize: row.second_prize ?? null,
      third_prize: row.third_prize ?? null,
      special_numbers: row.special_numbers ?? null,
      consolation_numbers: row.consolation_numbers ?? null,
      jackpot1_amount: row.jackpot1_amount ?? null,
      jackpot2_amount: row.jackpot2_amount ?? null,
      zodiac: row.zodiac ?? null,
      extra_data: row.extra_data ?? null,
    });

    if (error) {
      throw new Error(`upsert ${operator}: ${error.message}`);
    }
  }
}

export async function fetchDrawsFromDb(
  region: Region,
  date: string
): Promise<Record<string, DrawRow>> {
  const supabase = createClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("draws")
    .select("*")
    .eq("region", region)
    .eq("date", date)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const byOperator: Record<string, DrawRow> = {};
  for (const draw of data ?? []) {
    if (!byOperator[draw.operator as string]) {
      byOperator[draw.operator as string] = draw as DrawRow;
    }
  }
  return byOperator;
}

export interface RegionResultsPayload {
  operators: Record<string, DrawRow>;
  date: string;
  region: Region;
  isLive: boolean;
  source: "live" | "cache" | "db" | "none";
}

export async function getRegionResults(
  region: Region,
  options?: { mockLive?: boolean; date?: string }
): Promise<RegionResultsPayload> {
  const date = options?.date ?? todayMYT();
  const isLive = isRegionLiveDraw(
    region,
    new Date(),
    options?.mockLive ?? false
  );

  const supabase = createClient();
  if (!supabase) {
    return { operators: {}, date, region, isLive, source: "none" };
  }

  const canScrape = isLive && shouldScrapeOnLive(region);

  if (canScrape) {
    const fresh = await isLiveCacheFresh(region, date);
    if (fresh) {
      const operators = await fetchDrawsFromDb(region, date);
      return { operators, date, region, isLive, source: "cache" };
    }

    try {
      const liveData = await scrapeLiveResults(region);
      if (Object.keys(liveData).length > 0) {
        await upsertDrawResults(liveData, date, region);
        return { operators: liveData, date, region, isLive, source: "live" };
      }
    } catch {
      /* fall through to DB */
    }
  }

  const operators = await fetchDrawsFromDb(region, date);
  return {
    operators,
    date,
    region,
    isLive,
    source: "db",
  };
}
