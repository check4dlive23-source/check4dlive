import { fetchSabah645ForDate } from "@/lib/ingest/diriwan88";
import type { DrawRow } from "@/lib/live-results";

/** Tier has at least one real Lotto 5/6 main number (not bonus/prize alone). */
export function hasRealSabahLottoNumbers(tier: unknown): boolean {
  if (!tier || typeof tier !== "object") return false;
  const nums = Array.isArray((tier as Record<string, unknown>).numbers)
    ? ((tier as Record<string, unknown>).numbers as unknown[])
    : [];
  return nums.some((n) => {
    const s = String(n ?? "").trim();
    return s !== "" && s !== "----";
  });
}

function hasRealSabahLottoTierList(tiers: unknown): boolean {
  if (!Array.isArray(tiers) || tiers.length === 0) return false;
  return tiers.some(hasRealSabahLottoNumbers);
}

/**
 * Prepare sabah extra_data for merge: drop placeholder lotto5/6 from existing when
 * incoming has real numbers; keep existing when it already has real numbers.
 */
export function coalesceSabahLottoForMerge(
  existing: unknown,
  incoming: unknown
): { incoming: unknown; existingForMerge: unknown } {
  if (incoming == null || typeof incoming !== "object") {
    return { incoming, existingForMerge: existing };
  }

  const incObj = { ...(incoming as Record<string, unknown>) };
  const incLotto = incObj.sabahLotto;
  if (!incLotto || typeof incLotto !== "object") {
    return { incoming: incObj, existingForMerge: existing };
  }

  const extObj =
    existing != null && typeof existing === "object"
      ? { ...(existing as Record<string, unknown>) }
      : {};

  const extLottoRaw = extObj.sabahLotto;
  const extLotto =
    extLottoRaw && typeof extLottoRaw === "object"
      ? { ...(extLottoRaw as Record<string, unknown>) }
      : {};

  const incL = incLotto as Record<string, unknown>;

  for (const game of ["lotto5", "lotto6"] as const) {
    const existTiers = extLotto[game];
    const incTiers = incL[game];

    if (hasRealSabahLottoTierList(existTiers)) {
      continue;
    }
    if (hasRealSabahLottoTierList(incTiers)) {
      delete extLotto[game];
    }
  }

  if (Object.keys(extLotto).length > 0) {
    extObj.sabahLotto = extLotto;
  } else {
    delete extObj.sabahLotto;
  }

  return { incoming: incObj, existingForMerge: extObj };
}

export function hasValidSabah645(row: DrawRow): boolean {
  const extra = row.extra_data as Record<string, unknown> | undefined;
  const raw = extra?.sabah645;
  if (!raw || typeof raw !== "object") return false;

  const s = raw as Record<string, unknown>;
  const balls = Array.isArray(s.balls) ? s.balls : [];
  if (balls.length !== 6) return false;
  if (
    !balls.every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 45
    )
  ) {
    return false;
  }
  const bonus = s.bonus;
  return typeof bonus === "number" && Number.isFinite(bonus) && bonus >= 1 && bonus <= 45;
}

/** Fill sabah645 from diriwan88.com when check4d omits 6/45. */
export async function supplementSabahFromDiriwan88(
  operators: Record<string, DrawRow>
): Promise<Record<string, DrawRow>> {
  const sabah = operators.sabah;
  if (!sabah || hasValidSabah645(sabah)) return operators;

  const rowDate = (sabah.date as string | undefined) ?? "";
  if (!rowDate) return operators;

  const official = await fetchSabah645ForDate(rowDate);
  if (!official) return operators;

  const existingExtra = {
    ...((sabah.extra_data as Record<string, unknown> | undefined) ?? {}),
  };
  existingExtra.sabah645 = {
    balls: official.balls,
    bonus: official.bonus,
    jackpot1: official.jackpot1,
    jackpot2: official.jackpot2,
  };

  const out: DrawRow = {
    ...sabah,
    extra_data: existingExtra,
  };
  if (official.draw_no && !out.draw_no) {
    out.draw_no = official.draw_no;
  }

  return { ...operators, sabah: out };
}
