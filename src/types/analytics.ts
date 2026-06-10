import type { HeatLevel } from "@/types/number-intelligence";

export interface HotNumberRow {
  number: string;
  total_hits: number;
  first_hits: number;
  last_seen: string | null;
  heat_score: number | null;
  heat_level: HeatLevel;
}

export interface ColdNumberRow {
  number: string;
  last_seen_date: string | null;
  gap_days: number;
  total_hits: number;
}

export interface DigitFrequency {
  digit: number;
  count: number;
}

export interface DigitAnalysis {
  thousands: DigitFrequency[];
  hundreds: DigitFrequency[];
  tens: DigitFrequency[];
  units: DigitFrequency[];
}

export interface PatternRow {
  pattern: string;
  example: string;
  hit_count: number;
}

export interface DrawListItem {
  id: string;
  date: string;
  operator: string;
  draw_no: string | null;
  first_prize: string | null;
  second_prize: string | null;
  third_prize: string | null;
  special_numbers: string[] | null;
  consolation_numbers: string[] | null;
}

export interface SearchResultRow {
  number: string;
  total_hits: number;
  last_seen: string | null;
  heat_score: number | null;
  heat_level: HeatLevel;
  operators: Record<string, number>;
}

export interface MirrorPairRow {
  numberA: string;
  numberB: string;
  hitsA: number;
  hitsB: number;
  totalHits: number;
}
