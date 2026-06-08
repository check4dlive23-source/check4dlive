import { AnalyticsDashboardHome } from "@/components/home/AnalyticsDashboardHome";
import {
  getHotNumbers,
  getColdNumbers,
  getWeeklyHotNumbers,
  getWeeklyHotNumbersLastWeek,
  getRisingNumbers,
} from "@/lib/analytics/queries";

export default async function HomePage() {
  const [hotResult, coldResult, weeklyResult, risingResult] = await Promise.all([
    getHotNumbers("30d", {}),
    getColdNumbers(30, {}),
    getWeeklyHotNumbers(10),
    getRisingNumbers(8),
  ]);

  const hot = (hotResult.rows ?? []).slice(0, 8);
  const cold = (coldResult.rows ?? []).slice(0, 8);
  const weeklyHero = (weeklyResult.rows ?? [])[0] ?? null;
  const weeklyTop10 = weeklyResult.rows ?? [];

  let lastWeekRank: number | null = null;
  if (weeklyHero) {
    const lastWeekResult = await getWeeklyHotNumbersLastWeek(10);
    const lastWeekRows = lastWeekResult.rows ?? [];
    const idx = lastWeekRows.findIndex((r) => r.number === weeklyHero.number);
    lastWeekRank = idx >= 0 ? idx + 1 : null;
  }

  const rising = (risingResult.rows ?? []).slice(0, 8);

  return (
    <AnalyticsDashboardHome
      initialHot={hot}
      initialCold={cold}
      initialWeeklyHero={weeklyHero}
      initialWeeklyTop10={weeklyTop10}
      initialRising={rising}
      initialLastWeekRank={lastWeekRank}
    />
  );
}
