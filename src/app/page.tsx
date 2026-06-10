import { AnalyticsDashboardHome } from "@/components/home/AnalyticsDashboardHome";
import {
  getHotNumbers,
  getColdNumbers,
  getWeeklyHotNumbers,
  getWeeklyHotNumbersLastWeek,
  getRisingNumbers,
} from "@/lib/analytics/queries";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  let totalDraws = 22889;
  let dataSpanYears = 40;

  if (supabase) {
    const { count } = await supabase
      .from("draw_results_v2")
      .select("*", { count: "exact", head: true });
    if (count) totalDraws = count;

    const { data: earliest } = await supabase
      .from("draw_results_v2")
      .select("draw_date")
      .order("draw_date", { ascending: true })
      .limit(1)
      .single();
    if (earliest?.draw_date) {
      const earliestYear = new Date(earliest.draw_date).getFullYear();
      dataSpanYears = new Date().getFullYear() - earliestYear + 1;
    }
  }

  const [hotResult, coldResult, weeklyResult, risingResult] = await Promise.all([
    getHotNumbers("30d", {}),
    getColdNumbers(30, {}),
    getWeeklyHotNumbers(10),
    getRisingNumbers(8),
  ]);

  const hot = (hotResult.rows ?? []).slice(0, 8);
  const cold = (coldResult.rows ?? []).slice(0, 8);
  const weeklyHero = (weeklyResult.rows ?? [])[0] ?? null;

  let lastWeekRank: number | null = null;
  if (weeklyHero) {
    const lastWeekResult = await getWeeklyHotNumbersLastWeek(10);
    const lastWeekRows = lastWeekResult.rows ?? [];
    const idx = lastWeekRows.findIndex((r) => r.number === weeklyHero.number);
    lastWeekRank = idx >= 0 ? idx + 1 : null;
  }

  const rising = (risingResult.rows ?? []).slice(0, 8);

  const OPERATOR_LIST = ["magnum", "damacai", "toto", "sabah88", "stc", "cashsweep", "singapore"];

  const operatorTopHot = await Promise.all(
    OPERATOR_LIST.map(async (op) => {
      const result = await getHotNumbers("30d", { operators: [op] });
      return {
        operator: op,
        topNumber: result.rows[0]?.number ?? null,
        totalHits: result.rows[0]?.total_hits ?? 0,
      };
    })
  );

  return (
    <AnalyticsDashboardHome
      initialHot={hot}
      initialCold={cold}
      initialWeeklyHero={weeklyHero}
      initialRising={rising}
      initialLastWeekRank={lastWeekRank}
      initialOperatorHot={operatorTopHot}
      totalDraws={totalDraws}
      dataSpanYears={dataSpanYears}
    />
  );
}
