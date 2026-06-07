import {
  getPatterns,
  parseAnalyticsFilter,
} from "@/lib/analytics/queries";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = parseAnalyticsFilter(searchParams);
  const { rows, source } = await getPatterns(filter);
  return NextResponse.json({ rows, source });
}
