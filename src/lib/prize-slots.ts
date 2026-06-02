import type { OperatorId } from "@/types";

export const CONSOLATION_SLOT_COUNT = 10;

const SPECIAL_SLOTS: Record<string, number> = {
  damacai: 10,
  magnum: 13,
  toto: 13,
  sabah: 13,
  sarawak: 13,
  sandakan: 13,
  gd: 13,
  perdana: 13,
  hari: 13,
  sgpools: 13,
};

export function specialSlotCount(operator: OperatorId | string): number {
  return SPECIAL_SLOTS[operator] ?? 13;
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
