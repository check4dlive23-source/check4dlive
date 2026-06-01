import { NumberSearch } from "@/components/search/NumberSearch";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Number Search | Check4D Live",
  description:
    "Search 4D numbers with wildcards. Find matching numbers across Magnum, Toto, Damacai history.",
};

export default function SearchPage() {
  return <NumberSearch />;
}
