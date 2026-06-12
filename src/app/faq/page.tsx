import type { Metadata } from "next";
import { FaqPageContent } from "./FaqPageContent";

export const metadata: Metadata = {
  title: "FAQ | Check4D Terminal",
  description:
    "Frequently asked questions about Check4D Terminal — data analytics, Number Score, VYRA, subscriptions, and support.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function FaqPage() {
  return <FaqPageContent />;
}
