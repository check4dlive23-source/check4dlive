/** heat_score = (total_hits / days_since_first_draw) / (current_gap_days + 1) */
export function calculateHeatScore(
  totalHits: number,
  daysSinceFirstDraw: number,
  currentGapDays: number
): number {
  if (daysSinceFirstDraw <= 0) return 0;
  return totalHits / daysSinceFirstDraw / (currentGapDays + 1);
}
