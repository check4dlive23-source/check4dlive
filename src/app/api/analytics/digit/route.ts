import { getDigitAnalysis } from "@/lib/analytics/queries";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, source } = await getDigitAnalysis();
  return NextResponse.json({ ...data, source });
}
