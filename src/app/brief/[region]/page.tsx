import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VyraBriefView } from "@/components/brief/VyraBriefView";
import { fetchVyraBrief } from "@/lib/vyra/brief-queries";
import type { VyraRegion } from "@/lib/vyra/types";

const VALID: VyraRegion[] = ["west", "east", "singapore"];

const REGION_TITLE: Record<VyraRegion, string> = {
  west: "西马",
  east: "东马",
  singapore: "新加坡",
};

export const revalidate = 600;

type Props = { params: { region: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const region = params.region as VyraRegion;
  if (!VALID.includes(region)) return { title: "VYRA Brief" };
  const brief = await fetchVyraBrief(region, "zh");
  const date = brief?.brief_date ?? new Date().toISOString().slice(0, 10);
  return {
    title: `${REGION_TITLE[region]}今日4D数据简报 ${date} - VYRA | Check4D Terminal`,
    description: `VYRA daily 4D data brief for ${region} — statistical signals, no predictions.`,
    robots: { index: true, follow: true },
  };
}

export default async function BriefRegionPage({ params }: Props) {
  const region = params.region as VyraRegion;
  if (!VALID.includes(region)) notFound();

  const [briefZh, briefEn] = await Promise.all([
    fetchVyraBrief(region, "zh"),
    fetchVyraBrief(region, "en"),
  ]);

  return (
    <VyraBriefView
      region={region}
      briefs={{ zh: briefZh, en: briefEn }}
    />
  );
}
