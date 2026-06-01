import type { OperatorId } from "@/types";

export type HeatLevel = "hot" | "cold" | "normal";

export interface NumberStatsPayload {
  number: string;
  total_hits: number;
  first_prize_hits: number;
  second_prize_hits: number;
  third_prize_hits: number;
  special_hits: number;
  consolation_hits: number;
  last_seen_date: string | null;
  last_seen_operator: string | null;
  last_seen_position: string | null;
  avg_gap_days: number | null;
  current_gap_days: number | null;
  heat_score: number | null;
  heat_level: HeatLevel;
}

export interface TimelinePoint {
  month: string;
  count: number;
}

export interface OperatorBreakdown {
  operator: OperatorId;
  label: string;
  total: number;
  first: number;
  second: number;
  third: number;
  special: number;
  consolation: number;
}

export interface RecentAppearance {
  date: string;
  operator: OperatorId;
  position: string;
  position_label: string;
  position_tier: "first" | "second" | "third" | "special" | "consolation";
  draw_no: string | null;
}

export interface RelatedNumber {
  number: string;
  reason: string;
  total_hits: number;
}

export interface NumberIntelligenceExtras {
  total_draws_analyzed: number;
  win_probability_pct: number;
  predicted_next_date: string | null;
  related_numbers: RelatedNumber[];
}

export interface NumberIntelligenceResponse {
  number: string;
  stats: NumberStatsPayload;
  timeline: TimelinePoint[];
  breakdown: OperatorBreakdown[];
  recent: RecentAppearance[];
  extras: NumberIntelligenceExtras;
}
