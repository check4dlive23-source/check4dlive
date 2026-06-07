import { Metadata } from "next";
import { RankingsView } from "@/components/rankings/RankingsView";
import {
  getTopHotNumbers,
  getTopColdNumbers,
  getTopFirstPrizeNumbers,
} from "@/lib/analytics/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "4D Number Rankings — Top 100 Hot, Cold & First Prize | Check4D",
  description:
    "Malaysia 4D number rankings based on 40 years of historical data. Top 100 most frequent numbers, coldest numbers, and first prize champions across Magnum, Damacai, Toto, Cash Sweep and Singapore Pools.",
};

export default async function RankingsPage() {
  const [hot, cold, firstPrize] = await Promise.all([
    getTopHotNumbers(100),
    getTopColdNumbers(100),
    getTopFirstPrizeNumbers(100),
  ]);

  return <RankingsView hot={hot} cold={cold} firstPrize={firstPrize} />;
}
