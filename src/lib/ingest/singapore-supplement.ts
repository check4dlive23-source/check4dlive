import { latestSgTotoDrawDate } from "@/lib/draw-time";
import { fetchSgTotoLatest } from "@/lib/ingest/singapore-api";
import type { DrawRow } from "@/lib/live-results";

function strField(v: unknown): string {
  return String(v ?? "").trim();
}

export function hasValidSgToto(row: DrawRow): boolean {
  const extra = row.extra_data as Record<string, unknown> | undefined;
  const raw = extra?.sgToto;
  if (!raw || typeof raw !== "object") return false;

  const s = raw as Record<string, unknown>;
  const balls = Array.isArray(s.balls) ? s.balls : [];
  if (balls.length !== 6) return false;
  if (
    !balls.every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 49
    )
  ) {
    return false;
  }
  const additional = s.additional;
  if (
    typeof additional !== "number" ||
    !Number.isFinite(additional) ||
    additional < 1 ||
    additional > 49
  ) {
    return false;
  }
  return strField(s.draw_no) !== "" && strField(s.date) !== "";
}

export function sgTotoNeedsOfficialSupplement(row: DrawRow): boolean {
  if (!hasValidSgToto(row)) return true;
  const extra = row.extra_data as Record<string, unknown> | undefined;
  const raw = (extra?.sgToto ?? {}) as Record<string, unknown>;
  const totoDate = strField(raw.date);
  const latest = latestSgTotoDrawDate();
  return totoDate < latest;
}

/** Fill sgToto from singaporepools.com.sg when check4d omits Toto. */
export async function supplementSgTotoFromOfficial(
  operators: Record<string, DrawRow>
): Promise<Record<string, DrawRow>> {
  const sg = operators.sgpools;
  if (!sg || !sgTotoNeedsOfficialSupplement(sg)) return operators;

  const official = await fetchSgTotoLatest();
  if (!official) return operators;

  const existingExtra = {
    ...((sg.extra_data as Record<string, unknown> | undefined) ?? {}),
  };
  existingExtra.sgToto = {
    balls: official.balls,
    additional: official.additional,
    group1Prize: official.group1Prize,
    group2Share: official.group2Share,
    draw_no: official.draw_no,
    date: official.date,
  };

  return {
    ...operators,
    sgpools: {
      ...sg,
      extra_data: existingExtra,
    },
  };
}
