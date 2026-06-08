import { getDrawHistory } from "@/lib/history-search";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const operator = searchParams.get("operator") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const result = await getDrawHistory({ date, operator, page });
  return NextResponse.json(
    result,
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
