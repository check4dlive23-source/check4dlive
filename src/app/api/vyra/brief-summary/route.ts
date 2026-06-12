import { fetchVyraBrief } from "@/lib/vyra/brief-queries";
import type { VyraRegion } from "@/lib/vyra/types";
import { NextResponse } from "next/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
};

function parseRegion(raw: string | null): VyraRegion | null {
  if (raw === "west" || raw === "east" || raw === "singapore") return raw;
  return null;
}

/** Latest zh brief snippet for home ticker. TODO: i18n — EN ticker copy. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = parseRegion(searchParams.get("region"));

  if (!region) {
    return NextResponse.json({ empty: true }, { headers: CACHE_HEADERS });
  }

  const brief = await fetchVyraBrief(region, "zh");
  if (!brief) {
    return NextResponse.json({ empty: true }, { headers: CACHE_HEADERS });
  }

  const narratives = [...brief.narrative]
    .sort((a, b) => a.signalIndex - b.signalIndex)
    .slice(0, 2)
    .map((n) => n.text)
    .filter(Boolean);

  return NextResponse.json(
    {
      brief_date: brief.brief_date,
      intro: brief.intro ?? "",
      narratives,
    },
    { headers: CACHE_HEADERS }
  );
}
