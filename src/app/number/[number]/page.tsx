import { NumberIntelView } from "@/components/number/NumberIntelView";
import {
  getNumberIntelligence,
  isValid4D,
  normalize4D,
} from "@/lib/number-intelligence";
import type { Metadata } from "next";
import type { NumberIntelMode } from "@/types/number-intelligence";
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
    return { title: "Invalid number | Check4D Live" };
  }

  const data = await getNumberIntelligenceCached(number);
  const hits = data?.stats.total_hits ?? 0;
  const lastDate = data?.stats.last_seen_date;

  const lastSeenText = lastDate
    ? `Last seen ${lastDate}.`
    : "No recorded appearances yet.";

  return {
    title: `4D Number ${number} — Statistics & History | Check4D Live`,
    description: `Number ${number} has appeared ${hits} times across Magnum, Toto, Damacai. ${lastSeenText}`,
    openGraph: {
      title: `4D Number ${number} — Check4D Live`,
      description: `${hits} total hits. ${lastSeenText}`,
    },
  };
}

export default async function NumberPage({ params, searchParams }: PageProps) {
  const number = normalize4D(params.number);
  if (!isValid4D(number)) {
    notFound();
  }

  const operators = searchParams.operators?.split(",").filter(Boolean) ?? [];
  const mode = parseMode(searchParams.mode);

  const data = await getNumberIntelligenceCached(number, {
    page: 1,
    pageSize: 500,
    operators,
    mode,
  });
  if (!data) {
    notFound();
  }

  return (
    <NumberIntelView data={data} operators={operators} mode={mode} />
  );
}
