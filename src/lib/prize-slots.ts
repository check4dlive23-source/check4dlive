import type { OperatorId } from "@/types";

export const CONSOLATION_SLOT_COUNT = 10;

const SPECIAL_SLOTS: Record<string, number> = {
  damacai: 10,
  magnum: 13,
  toto: 13,
  sabah: 13,
  sarawak: 10,
  cashsweep: 10,
  sandakan: 13,
  gd: 13,
  perdana: 13,
  hari: 13,
  sgpools: 10,
};

export function specialSlotCount(operator: OperatorId | string): number {
  return SPECIAL_SLOTS[operator] ?? 13;
}

/** Alias used by UI — damacai/sgpools: 10, others per SPECIAL_SLOTS */
export function getSpecialCount(operator: string): number {
  return specialSlotCount(operator);
}

/** Coerce DB/SSE values into a string array (handles null, JSON string, sparse data). */
export function coercePrizeArray(
  values: string[] | string | null | undefined
): string[] {
  if (values == null) return [];
  if (Array.isArray(values)) {
    return values.map((v) => {
      if (v == null) return "----";
      const s = String(v).trim();
      if (!s || s === "-" || s === "—") return "----";
      return s;
    });
  }
  if (typeof values === "string") {
    const trimmed = values.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) return coercePrizeArray(parsed as string[]);
      } catch {
        /* fall through */
      }
    }
    return [trimmed];
  }
  return [];
}

export function padPrizeSlots(
  values: string[] | string | null | undefined,
  count: number
): string[] {
  if (count <= 0) return [];
  const out = coercePrizeArray(values);
  while (out.length < count) {
    out.push("----");
  }
  return out.slice(0, count);
}
