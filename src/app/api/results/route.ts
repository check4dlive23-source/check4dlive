import { isDrawDayAndNearDraw } from "@/lib/draw-time";
import { getRegionResults } from "@/lib/live-results";
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

  try {
    const payload = await getRegionResults(region, { mockLive });
    const drawDay = isDrawDayAndNearDraw(region);

    const headers: HeadersInit = {
      "Cache-Control":
        payload.isLive && payload.source === "live"
          ? "no-store, max-age=0"
          : "private, max-age=30",
    };

    return NextResponse.json(
      {
        operators: payload.operators,
        isLive: payload.isLive,
        date: payload.date,
        region: payload.region,
        source: payload.source,
        isDrawDay: drawDay,
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
