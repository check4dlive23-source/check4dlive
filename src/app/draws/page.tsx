import { DrawExplorer } from "@/components/draws/DrawExplorer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Draw Explorer | Check4D Live",
  description: "Browse Malaysian 4D draw history by date and operator.",
};

export default function DrawsPage() {
  return <DrawExplorer />;
}
