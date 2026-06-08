import {
  getDigitAnalysis,
  parseAnalyticsFilter,
} from "@/lib/analytics/queries";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = parseAnalyticsFilter(searchParams);
  const { data, source } = await getDigitAnalysis(filter);
  return NextResponse.json(
    { ...data, source },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
