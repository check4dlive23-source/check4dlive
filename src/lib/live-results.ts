import { createClient } from "@/lib/supabase/server";
import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";
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
  region: Region,
  preloaded?: ParsedWestDraw[]
): Promise<Record<string, DrawRow>> {
  const parsed = (preloaded ?? (await fetchAllCheck4dDraws())).filter(
    (d) => d.region === region
  );

  const operators: Record<string, DrawRow> = {};
  for (const draw of parsed) {
    operators[draw.operator] = {
      ...toDbRow(draw),
      id: `live-${draw.operator}`,
      created_at: new Date().toISOString(),
    };
  }
  return operators;
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
    const { error } = await supabase.from("draws").upsert(
      {
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
      },
      {
        onConflict: "operator,date",
        ignoreDuplicates: false,
      }
    );

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

  console.log(
    `[fetchDrawsFromDb] region=${region} date=${date} count=${data?.length} error=${error?.message}`
  );

  if (error) throw new Error(error.message);

  const byOperator: Record<string, DrawRow> = {};
  for (const draw of data ?? []) {
    if (!byOperator[draw.operator as string]) {
      byOperator[draw.operator as string] = draw as DrawRow;
    }
  }

  if (Object.keys(byOperator).length === 0) {
    const { data: latest } = await supabase
      .from("draws")
      .select("*")
      .eq("region", region)
      .order("date", { ascending: false })
      .limit(10);

    for (const draw of latest ?? []) {
      const op = draw.operator as string;
      if (!byOperator[op]) {
        byOperator[op] = draw as DrawRow;
      }
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

/** Cron-only: one check4dresult fetch, upsert all live regions into Supabase */
export async function runLiveCronIngest(): Promise<{
  skipped: boolean;
  scraped?: Region[];
  operators?: number;
  date?: string;
  error?: string;
}> {
  const regions: Region[] = ["west", "east", "cambodia", "singapore"];
  const liveRegions = regions.filter((r) => isRegionLiveDraw(r));
  if (liveRegions.length === 0) {
    return { skipped: true };
  }

  const date = todayMYT();
  let totalCount = 0;

  try {
    const allParsed = await fetchAllCheck4dDraws();

    for (const region of liveRegions) {
      const liveData = await scrapeLiveResults(region, allParsed);
      if (Object.keys(liveData).length > 0) {
        await upsertDrawResults(liveData, date, region);
        totalCount += Object.keys(liveData).length;
      }
    }

    return {
      skipped: false,
      scraped: liveRegions,
      operators: totalCount,
      date,
    };
  } catch (e) {
    return {
      skipped: false,
      scraped: liveRegions,
      operators: totalCount,
      date,
      error: e instanceof Error ? e.message : "Live ingest failed",
    };
  }
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

  const operators = await fetchDrawsFromDb(region, date);
  let resolvedDate = date;

  if (Object.keys(operators).length > 0) {
    const dates = Object.values(operators)
      .map((o) => o.date as string)
      .filter(Boolean)
      .sort()
      .reverse();
    if (dates[0]) resolvedDate = dates[0];
  }

  return {
    operators,
    date: resolvedDate,
    region,
    isLive,
    source: "db",
  };
}
