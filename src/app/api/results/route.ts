import {
  getSingaporeLiveWindows,
  isRegionLiveDraw,
  todayMYT,
} from "@/lib/draw-time";
import { getRegionResults, shouldScrapeRegion } from "@/lib/live-results";
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
    const today = todayMYT();
    let payload = await getRegionResults(region, { mockLive });

    if (shouldScrapeRegion(region, payload.operators, today, mockLive)) {
      await scrapeAndCacheRegion(region);
      payload = await getRegionResults(region, { mockLive });
    }

    const sgWindows =
      region === "singapore"
        ? getSingaporeLiveWindows(now, mockLive)
        : undefined;

    const headers: HeadersInit = {
      "Cache-Control": "no-store, max-age=0",
    };

    return NextResponse.json(
      {
        operators: payload.operators,
        isLive: inLiveWindow,
        inLiveWindow,
        ...(sgWindows ?? {}),
        date: payload.date,
        region: payload.region,
        source: payload.source,
        dataTimestamp: payload.dataTimestamp,
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
