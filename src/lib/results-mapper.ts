import type { DrawResult, DrawStatus, OperatorId, Region } from "@/types";

export interface DbDrawRow {
  id?: string;
  date: string;
  draw_no?: string | null;
  operator: string;
  region: string;
  first_prize?: string | null;
  second_prize?: string | null;
  third_prize?: string | null;
  special_numbers?: string[] | null;
  consolation_numbers?: string[] | null;
  jackpot1_amount?: number | null;
  jackpot2_amount?: number | null;
  zodiac?: string | null;
  extra_data?: Record<string, unknown> | null;
  created_at?: string;
}

const DISPLAY_NAMES: Record<string, string> = {
  magnum: "Magnum 4D",
  damacai: "Damacai 1+3D",
  toto: "Sports Toto 4D",
  sabah: "Sabah Lotto88 4D",
  sarawak: "Cash Sweep 4D",
  sandakan: "Sandakan STC 4D",
  gd: "Grand Dragon Lotto 4D",
  perdana: "Perdana 4D",
  hari: "Lucky Hari Hari 4D",
  sgpools: "Singapore Pools 4D",
};

const SUBTITLES: Partial<Record<Region, string>> = {
  west: "Wed/Sat/Sun 7:00PM",
  east: "Wed/Sat/Sun 6:30PM",
  cambodia: "Daily",
  singapore: "Wed/Sat/Sun 6:30PM",
};

function mapStatus(first?: string | null): DrawStatus {
  if (!first || first === "----") return "pending";
  return "drawn";
}

export function dbRowToDrawResult(row: DbDrawRow): DrawResult {
  const operator = row.operator as OperatorId;
  const region = row.region as Region;
  return {
    operator,
    region,
    displayName: DISPLAY_NAMES[operator] ?? row.operator,
    subtitle: SUBTITLES[region],
    date: row.date,
    draw_no: row.draw_no ?? undefined,
    status: mapStatus(row.first_prize),
    first_prize: row.first_prize ?? undefined,
    second_prize: row.second_prize ?? undefined,
    third_prize: row.third_prize ?? undefined,
    special_numbers: row.special_numbers ?? undefined,
    consolation_numbers: row.consolation_numbers ?? undefined,
    jackpot1_amount: row.jackpot1_amount ?? undefined,
    jackpot2_amount: row.jackpot2_amount ?? undefined,
    zodiac: row.zodiac ?? undefined,
  };
}

export function mergeDrawResult(
  mock: DrawResult,
  api?: DbDrawRow | null
): DrawResult {
  if (!api?.first_prize || api.first_prize === "----") return mock;
  return dbRowToDrawResult(api);
}
