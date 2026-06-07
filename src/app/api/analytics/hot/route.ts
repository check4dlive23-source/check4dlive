import {
  getHotNumbers,
  parseAnalyticsFilter,
} from "@/lib/analytics/queries";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") === "100draws" ? "100draws" : "30d";
  const filter = parseAnalyticsFilter(searchParams);
  const { rows, source } = await getHotNumbers(period, filter);
  return NextResponse.json({ rows, period, source });
}
