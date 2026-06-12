import {
  fetchMagnumOfficialForDate,
  fetchMagnumTodayDraw,
} from "@/lib/ingest/magnum-api";
import type { DrawResultV2Row } from "@/lib/draw-results-v2";
import { todayMYT } from "@/lib/draw-time";
import type { DrawRow } from "@/lib/live-results";

function isEmptyVal(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") {
    const s = v.trim();
    return s === "" || s === "----";
  }
  return false;
}

function mergeShallowEmpty(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined
): Record<string, unknown> {
  const out = { ...(existing ?? {}) };
  if (!incoming) return out;
  for (const [k, v] of Object.entries(incoming)) {
    if (!isEmptyVal(v) && isEmptyVal(out[k])) {
      out[k] = v;
    }
  }
  return out;
}

function isGoldSectionEmpty(gold: unknown): boolean {
  if (!gold || typeof gold !== "object") return true;
  const g = gold as Record<string, unknown>;
  return [
    "number1",
    "number2",
    "number3",
    "number4",
    "number5",
    "number6",
    "goldenNumber1",
    "goldenNumber2",
    "jackpot1",
    "jackpot2",
  ].every((k) => isEmptyVal(g[k]));
}

function isLifeSectionEmpty(life: unknown): boolean {
  if (!life || typeof life !== "object") return true;
  const l = life as Record<string, unknown>;
  return [
    "number1",
    "number2",
    "number3",
    "number4",
    "number5",
    "number6",
    "number7",
    "number8",
    "bonus1",
    "bonus2",
  ].every((k) => isEmptyVal(l[k]));
}

export function magnumNeedsOfficialSupplement(row: DrawRow): boolean {
  if (row.jackpot1_amount == null || row.jackpot2_amount == null) return true;
  const extra = row.extra_data as Record<string, unknown> | undefined;
  if (!extra) return true;
  if (isGoldSectionEmpty(extra.gold)) return true;
  if (isLifeSectionEmpty(extra.life)) return true;
  return false;
}

function officialGoldForCheck4d(
  offGold: Record<string, unknown>
): Record<string, unknown> {
  return {
    jackpot1: offGold.jackpot1 ?? "",
    jackpot2: offGold.jackpot2 ?? "",
  };
}

export function mergeMagnumOfficialSupplement(
  row: DrawRow,
  official: DrawResultV2Row
): DrawRow {
  const out: DrawRow = { ...row };
  const offExtra = (official.extra_data ?? {}) as Record<string, unknown>;
  const jackpot = offExtra.jackpot as
    | { jackpot1_amount?: number | null; jackpot2_amount?: number | null }
    | undefined;

  if (out.jackpot1_amount == null && jackpot?.jackpot1_amount != null) {
    out.jackpot1_amount = jackpot.jackpot1_amount;
  }
  if (out.jackpot2_amount == null && jackpot?.jackpot2_amount != null) {
    out.jackpot2_amount = jackpot.jackpot2_amount;
  }

  const existingExtra = {
    ...((out.extra_data as Record<string, unknown> | undefined) ?? {}),
  };
  const offGold = (offExtra.gold as Record<string, unknown> | undefined) ?? {};
  const offLife = (offExtra.life as Record<string, unknown> | undefined) ?? {};

  existingExtra.gold = mergeShallowEmpty(
    existingExtra.gold as Record<string, unknown> | undefined,
    officialGoldForCheck4d(offGold)
  );
  existingExtra.life = mergeShallowEmpty(
    existingExtra.life as Record<string, unknown> | undefined,
    offLife
  );

  out.extra_data = existingExtra;
  return out;
}

/** Fill Magnum jackpot / Gold / Life from magnum4d.my when check4d gaps exist. */
export async function supplementMagnumFromOfficial(
  operators: Record<string, DrawRow>
): Promise<Record<string, DrawRow>> {
  const magnum = operators.magnum;
  if (!magnum || !magnumNeedsOfficialSupplement(magnum)) {
    return operators;
  }

  const rowDate = (magnum.date as string | undefined) ?? todayMYT();
  let official: DrawResultV2Row | null = null;

  try {
    official = await fetchMagnumTodayDraw();
    if (
      !official ||
      (official.draw_date !== rowDate &&
        official.draw_date !== (magnum.date as string))
    ) {
      official = await fetchMagnumOfficialForDate(rowDate);
    }
  } catch (e) {
    console.warn(
      "[magnum-supplement] official API failed:",
      e instanceof Error ? e.message : e
    );
    return operators;
  }

  if (!official) {
    console.warn(
      `[magnum-supplement] no official draw for ${rowDate} (non-draw day or API empty)`
    );
    return operators;
  }

  return {
    ...operators,
    magnum: mergeMagnumOfficialSupplement(magnum, official),
  };
}
