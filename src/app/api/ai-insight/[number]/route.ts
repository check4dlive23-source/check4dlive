import { getOrCreateInsight } from "@/lib/ai/number-insight";
import { NextResponse } from "next/server";

const hits = new Map<string, { count: number; reset: number }>();
const LIMIT = 20;
const WINDOW = 600_000;

export async function GET(
  request: Request,
  { params }: { params: { number: string } }
) {
  const number = params.number;
  if (!/^\d{4}$/.test(number))
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW });
  } else if (rec.count >= LIMIT) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  } else {
    rec.count += 1;
  }
  if (hits.size > 5000) hits.clear();

  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") === "zh" ? "zh" : "en";
  const operators = searchParams.get("operators")?.split(",").filter(Boolean) ?? [];
  const content = await getOrCreateInsight(number, lang, operators);
  if (!content)
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ content });
}
