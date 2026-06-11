import { getScoreTrend } from "@/lib/score/snapshots";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: { number: string } }
) {
  const number = params.number;
  if (!/^\d{4}$/.test(number)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const trend = await getScoreTrend(number, 30);
  return NextResponse.json({ trend });
}
