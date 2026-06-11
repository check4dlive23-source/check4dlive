import { padPrizeSlots, specialSlotCount } from "@/lib/prize-slots";
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
  singapore: "Wed/Sat/Sun 6:30PM SGT",
};

export function isRealNum(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}$/.test(v);
}

function rowHasAnyNumber(row: DbDrawRow): boolean {
  return (
    isRealNum(row.first_prize) ||
    isRealNum(row.second_prize) ||
    isRealNum(row.third_prize) ||
    (row.special_numbers ?? []).some(isRealNum) ||
    (row.consolation_numbers ?? []).some(isRealNum)
  );
}

function isDrawComplete(row: DbDrawRow, operator: OperatorId): boolean {
  if (
    !isRealNum(row.first_prize) ||
    !isRealNum(row.second_prize) ||
    !isRealNum(row.third_prize)
  ) {
    return false;
  }
  const spCount = specialSlotCount(operator);
  const specials = padPrizeSlots(row.special_numbers, spCount);
  const consolations = padPrizeSlots(row.consolation_numbers, 10);
  return specials.every(isRealNum) && consolations.every(isRealNum);
}

function mapStatus(row: DbDrawRow, inLiveWindow: boolean): DrawStatus {
  const operator = row.operator as OperatorId;
  if (!rowHasAnyNumber(row)) return "pending";
  if (isDrawComplete(row, operator)) return "drawn";
  return inLiveWindow ? "live" : "drawn";
}

export function dbRowToDrawResult(
  row: DbDrawRow,
  inLiveWindow = false
): DrawResult {
  const operator = row.operator as OperatorId;
  const region = row.region as Region;
  const prizes = padDrawPrizes(
    operator,
    row.special_numbers,
    row.consolation_numbers
  );
  return {
    operator,
    region,
    displayName: DISPLAY_NAMES[operator] ?? row.operator,
    subtitle: SUBTITLES[region],
    date: row.date,
    draw_no: row.draw_no ?? undefined,
    status: mapStatus(row, inLiveWindow),
    first_prize: row.first_prize ?? undefined,
    second_prize: row.second_prize ?? undefined,
    third_prize: row.third_prize ?? undefined,
    special_numbers: prizes.special_numbers,
    consolation_numbers: prizes.consolation_numbers,
    jackpot1_amount: row.jackpot1_amount ?? undefined,
    jackpot2_amount: row.jackpot2_amount ?? undefined,
    zodiac: operator === "toto" ? row.zodiac ?? undefined : undefined,
  };
}

function padDrawPrizes(
  operator: OperatorId,
  special?: string[] | null,
  consolation?: string[] | null
) {
  const spCount = specialSlotCount(operator);
  return {
    special_numbers: padPrizeSlots(special, spCount),
    consolation_numbers: padPrizeSlots(consolation, 10),
  };
}

function withPaddedPrizes(draw: DrawResult): DrawResult {
  const operator = draw.operator;
  const prizes = padDrawPrizes(
    operator,
    draw.special_numbers,
    draw.consolation_numbers
  );
  return {
    ...draw,
    ...prizes,
    zodiac: operator === "toto" ? draw.zodiac : undefined,
  };
}

function hasTodayAnyNumber(
  api: DbDrawRow | null | undefined,
  today: string
): boolean {
  return !!(
    api &&
    (api.date as string) === today &&
    rowHasAnyNumber(api)
  );
}

function buildDrawDayPending(mock: DrawResult, today: string): DrawResult {
  return withPaddedPrizes({
    ...mock,
    date: today,
    status: "pending",
    first_prize: "----",
    second_prize: "----",
    third_prize: "----",
    special_numbers: Array(specialSlotCount(mock.operator)).fill("----"),
    consolation_numbers: Array(10).fill("----"),
  });
}

export function mergeDrawResult(
  mock: DrawResult,
  api?: DbDrawRow | null,
  inLiveWindow = false,
  today = ""
): DrawResult {
  if (
    inLiveWindow &&
    today &&
    (!api || (api.date as string) !== today || !hasTodayAnyNumber(api, today))
  ) {
    return buildDrawDayPending(mock, today);
  }

  if (!api) {
    if (mock.operator === "sgpools") {
      return withPaddedPrizes({
        ...mock,
        special_numbers: [],
      });
    }
    return withPaddedPrizes(mock);
  }

  const fromApi = dbRowToDrawResult(api, inLiveWindow);
  const date = fromApi.date || mock.date;
  const draw_no = fromApi.draw_no ?? mock.draw_no;

  return withPaddedPrizes({
    ...fromApi,
    date,
    draw_no,
    displayName: fromApi.displayName || mock.displayName,
    subtitle: fromApi.subtitle ?? mock.subtitle,
    jackpot1_amount: fromApi.jackpot1_amount ?? mock.jackpot1_amount,
    jackpot2_amount: fromApi.jackpot2_amount ?? mock.jackpot2_amount,
  });
}
