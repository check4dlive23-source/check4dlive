import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics Dashboard | Check4D Live",
  description:
    "Hot and cold 4D numbers, digit frequency heatmaps, and pattern analysis for Malaysian lottery.",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
