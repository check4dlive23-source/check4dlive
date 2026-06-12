import { fetchSabah645ForDate } from "@/lib/ingest/diriwan88";
import type { DrawRow } from "@/lib/live-results";

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
