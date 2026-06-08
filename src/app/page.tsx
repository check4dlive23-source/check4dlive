import { AnalyticsDashboardHome } from "@/components/home/AnalyticsDashboardHome";
import { getHotNumbers, getColdNumbers } from "@/lib/analytics/queries";

export default async function HomePage() {
  const [hotResult, coldResult] = await Promise.all([
    getHotNumbers("30d", {}),
    getColdNumbers(30, {}),
  ]);

  const hot = (hotResult.rows ?? []).slice(0, 8);
  const cold = (coldResult.rows ?? []).slice(0, 8);

  return <AnalyticsDashboardHome initialHot={hot} initialCold={cold} />;
}
