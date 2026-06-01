import { getColdNumbers } from "@/lib/analytics/queries";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minGap = parseInt(searchParams.get("min_gap") ?? "200", 10);
  const { rows, source } = await getColdNumbers(minGap);
  return NextResponse.json({ rows, min_gap: minGap, source });
}
