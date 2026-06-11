import { NumberIntelView } from "@/components/number/NumberIntelView";
import { getCachedInsight } from "@/lib/ai/number-insight";
import {
  getNumberIntelligence,
  isValid4D,
  normalize4D,
} from "@/lib/number-intelligence";
import { getNumberScore } from "@/lib/score/queries";
import type { Metadata } from "next";
import type {
  NumberIntelMode,
  NumberIntelligenceResponse,
} from "@/types/number-intelligence";
import { notFound } from "next/navigation";
import { cache } from "react";

const getNumberIntelligenceCached = cache(getNumberIntelligence);

function parseMode(raw?: string): NumberIntelMode {
  if (raw === "reverse" || raw === "full") return raw;
  return "single";
}

export const revalidate = 3600;

const COMMON_NUMBERS = [
  "0000",
  "0123",
  "0888",
  "1234",
  "1688",
  "2345",
  "3333",
  "3888",
  "4444",
  "5555",
  "6666",
  "6668",
  "7788",
  "8888",
  "9999",
];

function staticParamsBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function fetchTopHotNumbers(): Promise<string[]> {
  try {
    const res = await fetch(
      `${staticParamsBaseUrl()}/api/analytics/hot?period=100draws&limit=100`
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { rows?: { number?: string }[] };
    if (!Array.isArray(data.rows)) return [];

    return data.rows
      .map((row) => row.number)
      .filter((n): n is string => typeof n === "string" && n.length > 0);
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const hotNumbers = await fetchTopHotNumbers();
  const merged = Array.from(new Set([...COMMON_NUMBERS, ...hotNumbers]));
  return merged.map((number) => ({ number }));
}

type PageProps = {
  params: { number: string };
  searchParams: { operators?: string; mode?: string };
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const number = normalize4D(params.number);
  if (!isValid4D(number)) {
    return { title: "Invalid number | Check4D Terminal" };
  }

  const data = await getNumberIntelligenceCached(number);
  const hits = data?.stats.total_hits ?? 0;
  const lastDate = data?.stats.last_seen_date;

  const lastSeenZh = lastDate ? `最近开出:${lastDate}。` : "";

  return {
    title: `${number} 4D 万字历史记录 & 分析 | 4D Number ${number} History — Check4D Terminal`,
    description: `${number} 历史开彩 ${hits} 次,覆盖万能 Magnum、多多 Toto、大马彩 Damacai、新加坡 Singapore Pools 等 7 家。${lastSeenZh}查看完整开彩记录、冷热分析与 AI 解读。`,
    openGraph: {
      title: `${number} 4D 万字历史 & 分析 | Check4D Terminal`,
      description: `${number} 历史开彩 ${hits} 次。${lastSeenZh}`,
    },
  };
}

function generateNumberJsonLd(number: string, data: NumberIntelligenceResponse) {
  const hits = data.stats.total_hits ?? 0;
  const lastDate = data.stats.last_seen_date;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `4D Number ${number} Statistics`,
    description: `Number ${number} has appeared ${hits} times across Malaysian 4D operators including Magnum, Damacai, Toto, Cash Sweep, Sabah 88, Sandakan and Singapore Pools.`,
    url: `https://check4dterminal.com/number/${number}`,
    keywords: [
      `4D number ${number}`,
      `${number} 4D history`,
      `Magnum ${number}`,
      `Damacai ${number}`,
      `Toto ${number}`,
    ],
    temporalCoverage: lastDate ? `../${lastDate}` : undefined,
    variableMeasured: [
      {
        "@type": "PropertyValue",
        name: "Total Appearances",
        value: hits,
      },
      {
        "@type": "PropertyValue",
        name: "First Prize Wins",
        value: data.stats.first_prize_hits ?? 0,
      },
      {
        "@type": "PropertyValue",
        name: "Heat Level",
        value: data.stats.heat_level,
      },
    ],
  };
}

export default async function NumberPage({ params, searchParams }: PageProps) {
  const number = normalize4D(params.number);
  if (!isValid4D(number)) {
    notFound();
  }

  const operators = searchParams.operators?.split(",").filter(Boolean) ?? [];
  const mode = parseMode(searchParams.mode);

  const [data, score, cachedInsight] = await Promise.all([
    getNumberIntelligenceCached(number, {
      page: 1,
      pageSize: 500,
      operators,
      mode,
    }),
    getNumberScore(number, operators),
    getCachedInsight(number, "zh", operators),
  ]);
  if (!data) {
    notFound();
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateNumberJsonLd(number, data)),
        }}
      />
      <NumberIntelView
        data={data}
        score={score}
        operators={operators}
        mode={mode}
        initialInsight={cachedInsight}
      />
    </>
  );
}
