import { getOrCreateInsight } from "@/lib/ai/number-insight";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { number: string } }
) {
  const number = params.number;
  if (!/^\d{4}$/.test(number))
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") === "zh" ? "zh" : "en";
  const content = await getOrCreateInsight(number, lang);
  if (!content)
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ content });
}
