import type { Metadata } from "next";
import { DisclaimerPageContent } from "./DisclaimerPageContent";

export const metadata: Metadata = {
  title: "Disclaimer | Check4D Terminal",
  description:
    "Check4D Terminal disclaimer — independent lottery data analytics, not affiliated with official operators.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function DisclaimerPage() {
  return <DisclaimerPageContent />;
}
