import {
  getColdNumbers,
  parseAnalyticsFilter,
} from "@/lib/analytics/queries";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minGap = parseInt(searchParams.get("min_gap") ?? "200", 10);
  const filter = parseAnalyticsFilter(searchParams);
  const { rows, source } = await getColdNumbers(minGap, filter);
  return NextResponse.json(
    { rows, min_gap: minGap, source },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
