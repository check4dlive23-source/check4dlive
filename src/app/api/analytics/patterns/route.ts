import { getPatterns } from "@/lib/analytics/queries";
import { NextResponse } from "next/server";

export async function GET() {
  const { rows, source } = await getPatterns();
  return NextResponse.json({ rows, source });
}
