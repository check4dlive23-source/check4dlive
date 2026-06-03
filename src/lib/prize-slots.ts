import type { OperatorId } from "@/types";

export const CONSOLATION_SLOT_COUNT = 10;

export function specialSlotCount(operator: OperatorId | string): number {
  if (operator === "damacai" || operator === "sgpools") return 10;
  if (
    operator === "sabah" ||
    operator === "sandakan" ||
    operator === "sarawak"
  ) {
    return 10;
  }
  return 13;
}

/** Alias used by UI — damacai/sgpools/east: 10, others: 13 */
export function getSpecialCount(operator: string): number {
  return specialSlotCount(operator);
}

export function padPrizeSlots(
  values: string[] | null | undefined,
  count: number
): string[] {
  const out = [...(values ?? [])];
  while (out.length < count) {
    out.push("----");
  }
  return out.slice(0, count);
}
