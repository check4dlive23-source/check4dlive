import type { OperatorId } from "@/types";

export const CONSOLATION_SLOT_COUNT = 10;

/** Magnum & Sports Toto use 13 special slots; all other 4D operators use 10 */
export function specialSlotCount(operator: OperatorId | string): number {
  return operator === "magnum" || operator === "toto" ? 13 : 10;
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
