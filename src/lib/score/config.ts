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
