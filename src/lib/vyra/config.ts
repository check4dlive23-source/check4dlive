import { scopeKeyFromUrlOperators } from "@/lib/score/config";
import type { VyraRegion } from "@/lib/vyra/types";

export const VYRA_SIGNAL_CONFIG = {
  digitSurge: { windowDays: 7, zThreshold: 2.0 },
  overdue: { gapRatioMin: 2.0, minHistoricalHits: 5, topN: 3 },
  scoreJump: { windowDays: 7, jumpThreshold: 10, topN: 3 },
  mirrorSync: { windowDays: 14 },
  maxSignalsPerBrief: 5,
} as const;

/** URL operator IDs per region → scope key via score config. */
export const VYRA_REGION_URL_OPERATORS: Record<
  VyraRegion,
  readonly string[]
> = {
  west: ["magnum", "damacai", "toto"],
  east: ["sabah", "cashsweep", "sandakan"],
  singapore: ["singapore"],
};

export const VYRA_REGION_SCOPE: Record<VyraRegion, string> = {
  west: scopeKeyFromUrlOperators([...VYRA_REGION_URL_OPERATORS.west]),
  east: scopeKeyFromUrlOperators([...VYRA_REGION_URL_OPERATORS.east]),
  singapore: scopeKeyFromUrlOperators([...VYRA_REGION_URL_OPERATORS.singapore]),
};

/** v2 draw_results_v2.operator values per region */
export const VYRA_REGION_V2_OPERATORS: Record<VyraRegion, readonly string[]> = {
  west: ["magnum", "damacai", "toto"],
  east: ["cashsweep", "sabah88", "stc"],
  singapore: ["singapore"],
};

/** score_snapshots are all-scope only today — per-scope snapshots TODO */
export const VYRA_SCORE_JUMP_SCOPE = "all" as const;
