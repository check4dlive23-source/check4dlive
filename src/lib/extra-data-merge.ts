/** Shared extra_data merge for draws upsert (live-results + supplements). */

function isEmptyVal(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "" || s === "----") return true;
    const stripped = s.replace(/RM|S\$|\$|,|-|\s/gi, "");
    if (stripped === "") return true;
    return false;
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return false;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    return v.every((item) => isEmptyVal(item));
  }
  if (typeof v === "object") {
    const vals = Object.values(v as Record<string, unknown>);
    if (vals.length === 0) return true;
    return vals.every((val) => isEmptyVal(val));
  }
  return false;
}

function mergeExtraSection(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!incoming && !existing) return undefined;
  const out = { ...(existing ?? {}) };
  if (!incoming) return Object.keys(out).length ? out : undefined;
  for (const [k, v] of Object.entries(incoming)) {
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      const merged = mergeExtraSection(
        out[k] as Record<string, unknown> | undefined,
        v as Record<string, unknown>
      );
      if (merged) out[k] = merged;
    } else if (!isEmptyVal(v)) {
      if (isEmptyVal(out[k])) out[k] = v;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function mergeExtraDataForUpsert(
  incoming: unknown,
  existing: unknown
): Record<string, unknown> | null | undefined {
  if (incoming == null) {
    return existing != null ? (existing as Record<string, unknown>) : undefined;
  }
  if (existing == null) {
    return incoming as Record<string, unknown>;
  }
  const merged = mergeExtraSection(
    existing as Record<string, unknown>,
    incoming as Record<string, unknown>
  );
  return merged ?? null;
}
