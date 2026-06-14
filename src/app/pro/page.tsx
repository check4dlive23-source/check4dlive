import type { Metadata } from "next";
import { ProPageContent } from "./ProPageContent";

export const metadata: Metadata = {
  title: "Check4D Terminal Pro | Check4D Terminal",
  description:
    "Upgrade to Pro for full VYRA briefs, deep number reports, and unlimited watchlist — historical data analytics only.",
  robots: { index: true, follow: true },
};

export default function ProPage() {
  return <ProPageContent />;
}
