import { getSessionPlan, isPaidMember } from "@/lib/subscription/get-user-plan";
import { VyraNumberReportView } from "@/components/vyra/VyraNumberReportView";
import { isValid4D, normalize4D } from "@/lib/number-intelligence";
import { buildNumberReport } from "@/lib/vyra/report";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 3600;

type Props = { params: { number: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const number = normalize4D(params.number);
  if (!isValid4D(number)) {
    return { title: "VYRA Report | Check4D Terminal" };
  }

  return {
    title: `${number} VYRA深度报告 - 历史分布·运营商拆解·同冷度对照`,
    description: `${number} 历史开出分布、运营商拆解、同冷度对照、镜像曲线与评分轨迹 — 纯历史数据统计。`,
    robots: { index: true, follow: true },
  };
}

export default async function VyraNumberReportPage({ params }: Props) {
  const number = normalize4D(params.number);
  if (!isValid4D(number)) notFound();

  const [report, plan] = await Promise.all([
    buildNumberReport(number),
    getSessionPlan(),
  ]);
  if (!report) notFound();

  return <VyraNumberReportView data={report} isPro={isPaidMember(plan)} />;
}
