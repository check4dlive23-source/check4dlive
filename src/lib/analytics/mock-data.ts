import type {
  ColdNumberRow,
  DigitAnalysis,
  HotNumberRow,
  PatternRow,
} from "@/types/analytics";
import type { HeatLevel } from "@/types/number-intelligence";

function heatLevel(score: number): HeatLevel {
  if (score > 0.08) return "hot";
  if (score < 0.02) return "cold";
  return "normal";
}

export const MOCK_HOT: HotNumberRow[] = [
  { number: "5984", total_hits: 4, first_hits: 1, last_seen: "2026-05-31", heat_score: 0.12, heat_level: heatLevel(0.12) },
  { number: "6982", total_hits: 3, first_hits: 1, last_seen: "2026-05-31", heat_score: 0.09, heat_level: heatLevel(0.09) },
  { number: "1660", total_hits: 3, first_hits: 1, last_seen: "2026-05-31", heat_score: 0.08, heat_level: "hot" },
  { number: "9088", total_hits: 2, first_hits: 0, last_seen: "2026-05-31", heat_score: 0.06, heat_level: "normal" },
  { number: "2631", total_hits: 2, first_hits: 0, last_seen: "2026-05-31", heat_score: 0.05, heat_level: "normal" },
  { number: "7840", total_hits: 2, first_hits: 0, last_seen: "2026-05-31", heat_score: 0.05, heat_level: "normal" },
  { number: "5119", total_hits: 2, first_hits: 0, last_seen: "2026-05-31", heat_score: 0.04, heat_level: "normal" },
  { number: "0396", total_hits: 1, first_hits: 0, last_seen: "2026-05-31", heat_score: 0.03, heat_level: "normal" },
  { number: "8724", total_hits: 1, first_hits: 0, last_seen: "2026-05-31", heat_score: 0.03, heat_level: "normal" },
  { number: "2505", total_hits: 1, first_hits: 0, last_seen: "2026-05-31", heat_score: 0.03, heat_level: "normal" },
];

export const MOCK_COLD: ColdNumberRow[] = Array.from({ length: 15 }, (_, i) => ({
  number: String(1000 + i * 111).padStart(4, "0"),
  last_seen_date: "2024-08-12",
  gap_days: 220 + i * 5,
  total_hits: 2 + (i % 4),
}));

function digitGrid(seed: number): DigitAnalysis["thousands"] {
  return Array.from({ length: 10 }, (_, d) => ({
    digit: d,
    count: Math.floor((seed + d * 7) % 45) + 5,
  }));
}

export const MOCK_DIGIT: DigitAnalysis = {
  thousands: digitGrid(3),
  hundreds: digitGrid(7),
  tens: digitGrid(11),
  units: digitGrid(5),
};

export const MOCK_PATTERNS: PatternRow[] = [
  { pattern: "Twin (AAAA)", example: "8888", hit_count: 12 },
  { pattern: "Twin (AAAA)", example: "1111", hit_count: 9 },
  { pattern: "Sequential", example: "1234", hit_count: 18 },
  { pattern: "Sequential", example: "6789", hit_count: 14 },
  { pattern: "Repeating pair (AABB)", example: "1122", hit_count: 22 },
  { pattern: "Repeating pair (AABB)", example: "3344", hit_count: 16 },
];

export function isAnalyticsEmpty(count: number): boolean {
  return count === 0;
}
