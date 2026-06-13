/** Number Score 权重与常量。调权重只改这里，不碰计算代码。 */
export const SCORE_WEIGHTS = {
  freq: 0.3,
  cycle: 0.25,
  momentum: 0.3,
  mirror: 0.15,
} as const;

export const MOMENTUM_WINDOW_DAYS = 30;
export const MIRROR_WINDOW_DAYS = 90;
/** gap 序列至少需要的唯一日期数，低于此 cycle 给中性分 */
export const MIN_DATES_FOR_CYCLE = 3;
/** 生涯天数低于此 momentum 给中性分 */
export const MIN_CAREER_DAYS = 30;
export const NEUTRAL_SCORE = 50;

/** momentum 混合窗口权重：30天为主，90天补颗粒度 */
export const MOMENTUM_BLEND = { w30: 0.6, w90: 0.4 } as const;

/** 等级阈值（按实际分布 min9/avg40/max70 校准，区别于旧版 80/70/50/40） */
export const SCORE_LEVELS = {
  strong: 62,
  bullish: 52,
  neutral: 42,
  weak: 30,
} as const;

export type ScoreGrade = "A" | "B" | "C" | "D" | "F";

export function scoreGrade(overall: number): ScoreGrade {
  if (overall >= SCORE_LEVELS.strong) return "A";
  if (overall >= SCORE_LEVELS.bullish) return "B";
  if (overall >= SCORE_LEVELS.neutral) return "C";
  if (overall >= SCORE_LEVELS.weak) return "D";
  return "F";
}

export function scoreColor(score: number): string {
  if (score >= SCORE_LEVELS.strong) return "#00E5FF";
  if (score >= SCORE_LEVELS.bullish) return "#22C55E";
  if (score >= SCORE_LEVELS.neutral) return "#FFB020";
  if (score >= SCORE_LEVELS.weak) return "#FF8A3D";
  return "#FF4D4D";
}

/** v2 运营商全集（与 draw_results_v2.operator 列值一致），用于 scope 生成 */
export const V2_OPERATORS = [
  "cashsweep",
  "damacai",
  "magnum",
  "sabah88",
  "singapore",
  "stc",
  "toto",
] as const;

/** URL 运营商 ID → v2 列值（与 number-intelligence.ts 的 URL_TO_V2_OPERATOR 一致） */
export const URL_TO_V2: Record<string, string> = {
  magnum: "magnum",
  damacai: "damacai",
  toto: "toto",
  cashsweep: "cashsweep",
  sabah: "sabah88",
  sandakan: "stc",
  singapore: "singapore",
};

/**
 * 由 URL operators 数组生成 scope key。
 * 规则：映射到 v2 ID → 去重 → 过滤非法 → 排序 → '+' 连接。
 * 空选 / 全选(7家) / 含非法ID导致为空 → 返回 'all'。
 */
export function scopeKeyFromUrlOperators(operators: string[]): string {
  const v2 = Array.from(
    new Set(
      operators
        .map((op) => URL_TO_V2[op])
        .filter((v): v is string => Boolean(v))
    )
  ).sort();
  if (v2.length === 0 || v2.length === V2_OPERATORS.length) return "all";
  return v2.join("+");
}
