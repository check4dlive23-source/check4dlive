import { getNumberIntelligence, isValid4D, normalize4D } from "@/lib/number-intelligence";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { number: string } }
) {
  const number = normalize4D(params.number);
  const url = new URL(_request.url);
  const page = Number(url.searchParams.get("page") ?? "1");

  if (!isValid4D(number)) {
    return NextResponse.json(
      { error: "Invalid number. Use 4 digits (0000-9999)." },
      { status: 400 }
    );
  }

  try {
    const data = await getNumberIntelligence(number, {
      page,
      pageSize: 50,
    });
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Query failed" },
      { status: 500 }
    );
  }
}
