import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getHotNumbers, getColdNumbers } from "@/lib/analytics/queries";
import { createClient } from "@/lib/supabase/server";
import { OperatorView } from "@/components/operator/OperatorView";

export const revalidate = 3600;

const OPERATOR_CONFIG: Record<string, {
  label: string;
  color: string;
  logo: string;
  games: string[];
  drawOperator: string;
}> = {
  magnum: {
    label: "Magnum",
    color: "#FFD700",
    logo: "/logos/magnum.gif",
    games: ["Magnum 4D", "Magnum Jackpot Gold", "Magnum Life"],
    drawOperator: "magnum",
  },
  damacai: {
    label: "Damacai",
    color: "#4466FF",
    logo: "/logos/damacai.gif",
    games: ["Damacai 1+3D", "Damacai 3D", "Damacai 3+3D Bonus"],
    drawOperator: "damacai",
  },
  toto: {
    label: "Toto",
    color: "#FF3333",
    logo: "/logos/toto.gif",
    games: ["Toto 4D", "Toto 5D", "Toto 6D", "Star Toto 6/50", "Power Toto 6/55", "Supreme Toto 6/58"],
    drawOperator: "toto",
  },
  sabah88: {
    label: "Sabah 88",
    color: "#F59E0B",
    logo: "/logos/sabah88.gif",
    games: ["Sabah 88 4D", "Sabah 3D", "Sabah Lotto"],
    drawOperator: "sabah88",
  },
  stc: {
    label: "STC Sandakan",
    color: "#F59E0B",
    logo: "/logos/sandakan.gif",
    games: ["Sandakan STC 4D"],
    drawOperator: "stc",
  },
  cashsweep: {
    label: "CashSweep",
    color: "#00FF88",
    logo: "/logos/cashsweep.gif",
    games: ["Cash Sweep 4D"],
    drawOperator: "cashsweep",
  },
  singapore: {
    label: "Singapore Pools",
    color: "#EC4899",
    logo: "/logos/sgpools.gif",
    games: ["Singapore Pools 4D", "Singapore Toto 6/45"],
    drawOperator: "singapore",
  },
};

export async function generateStaticParams() {
  return Object.keys(OPERATOR_CONFIG).map((name) => ({ name }));
}

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
  const op = OPERATOR_CONFIG[params.name];
  if (!op) return {};
  return {
    title: `${op.label} 4D Results & Hot Numbers | Check4D Terminal`,
    description: `${op.label} historical results, hot numbers, cold numbers and draw records. AI-powered analytics for ${op.label} 4D.`,
  };
}

export default async function OperatorPage({ params }: { params: { name: string } }) {
  const op = OPERATOR_CONFIG[params.name];
  if (!op) notFound();

  const supabase = createClient();

  const emptyDraws = { data: [] as {
    id: string;
    draw_date: string;
    operator: string;
    first_prize: string | null;
    second_prize: string | null;
    third_prize: string | null;
  }[], count: 0 };
  const emptyEarliest = { data: [] as { draw_date: string }[] };

  // 并行预取所有数据
  const [hotResult, coldResult, drawsResult, countResult, earliestResult] = await Promise.all([
    getHotNumbers("30d", { operators: [op.drawOperator], limit: 10 }),
    getColdNumbers(30, { operators: [op.drawOperator], limit: 10 }),
    supabase
      ? supabase
          .from("draw_results_v2")
          .select("id, draw_date, operator, first_prize, second_prize, third_prize")
          .eq("operator", op.drawOperator)
          .order("draw_date", { ascending: false })
          .limit(10)
      : Promise.resolve(emptyDraws),
    supabase
      ? supabase
          .from("draw_results_v2")
          .select("*", { count: "exact", head: true })
          .eq("operator", op.drawOperator)
      : Promise.resolve({ count: 0 }),
    supabase
      ? supabase
          .from("draw_results_v2")
          .select("draw_date")
          .eq("operator", op.drawOperator)
          .order("draw_date", { ascending: true })
          .limit(1)
      : Promise.resolve(emptyEarliest),
  ]);

  const totalDraws = countResult.count ?? 0;
  const earliestDate = earliestResult.data?.[0]?.draw_date ?? null;
  const latestDraw = drawsResult.data?.[0]?.draw_date ?? null;

  const recentDraws = (drawsResult.data ?? []).map((draw) => ({
    id: draw.id,
    date: draw.draw_date,
    operator: draw.operator,
    first_prize: draw.first_prize ?? "",
    second_prize: draw.second_prize ?? "",
    third_prize: draw.third_prize ?? "",
  }));

  return (
    <OperatorView
      name={params.name}
      label={op.label}
      color={op.color}
      logo={op.logo}
      games={op.games}
      hotNumbers={hotResult.rows}
      coldNumbers={coldResult.rows}
      recentDraws={recentDraws}
      totalDraws={totalDraws}
      earliestDate={earliestDate}
      latestDate={latestDraw}
    />
  );
}
