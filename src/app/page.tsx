import { AnalyticsDashboardHome } from "@/components/home/AnalyticsDashboardHome";
import { getHotNumbers, getColdNumbers, getWeeklyHotNumbers, getRisingNumbers } from "@/lib/analytics/queries";

export default async function HomePage() {
  const [hotResult, coldResult, weeklyResult, risingResult] = await Promise.all([
    getHotNumbers("30d", {}),
    getColdNumbers(30, {}),
    getWeeklyHotNumbers(1),
    getRisingNumbers(8),
  ]);

  const hot = (hotResult.rows ?? []).slice(0, 8);
  const cold = (coldResult.rows ?? []).slice(0, 8);
  const weeklyHero = (weeklyResult.rows ?? [])[0] ?? null;
  const rising = (risingResult.rows ?? []).slice(0, 8);

  return <AnalyticsDashboardHome initialHot={hot} initialCold={cold} initialWeeklyHero={weeklyHero} initialRising={rising} />;
}
