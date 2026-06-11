import { isRegionLiveDraw } from "@/lib/draw-time";
import { getRegionResults } from "@/lib/live-results";
import { scrapeAndCacheRegion } from "@/lib/live-scrape-cache";
import type { Region } from "@/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = (searchParams.get("region") || "west") as Region;
  const mockLive =
    process.env.NODE_ENV === "development" &&
    searchParams.get("mock_live") === "1";
  const now = new Date();

  try {
    const inLiveWindow = isRegionLiveDraw(region, now, mockLive);
    if (inLiveWindow) {
      await scrapeAndCacheRegion(region);
    }

    const payload = await getRegionResults(region, { mockLive });

    const headers: HeadersInit = {
      "Cache-Control": "no-store, max-age=0",
    };

    return NextResponse.json(
      {
        operators: payload.operators,
        isLive: inLiveWindow,
        inLiveWindow,
        date: payload.date,
        region: payload.region,
        source: payload.source,
      },
      { headers }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load results" },
      { status: 500 }
    );
  }
}
