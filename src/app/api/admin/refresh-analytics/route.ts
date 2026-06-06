import { writeCache } from "@/lib/analytics/cache";
import {
  computeColdNumbers,
  computeDigitAnalysis,
  computeHotNumbers,
  computePatterns,
} from "@/lib/analytics/queries";
import { NextResponse } from "next/server";

function authorize(request: Request): { ok: true } | { ok: false; reason: string } {
  const secret = process.env.INGEST_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return {
      ok: false,
      reason: "INGEST_SECRET is not set. Add it to .env.local and restart.",
    };
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return {
      ok: false,
      reason:
        'Missing Authorization header. Use: curl.exe -X POST ... -H "Authorization: Bearer YOUR_SECRET"',
    };
  }

  if (auth.slice(7) !== secret) {
    return { ok: false, reason: "Bearer token does not match INGEST_SECRET." };
  }

  return { ok: true };
}

export const dynamic = "force-dynamic";

async function refreshAnalytics() {
  const hot30 = await computeHotNumbers("30d");
  await writeCache("hot_30d", hot30.rows);

  const hot100 = await computeHotNumbers("100draws");
  await writeCache("hot_100draws", hot100.rows);

  const cold = await computeColdNumbers(30);
  await writeCache("cold_30", cold.rows);

  const digit = await computeDigitAnalysis();
  await writeCache("digit", digit.data);

  const patterns = await computePatterns();
  await writeCache("patterns", patterns.rows);

  return {
    success: true,
    updated: ["hot_30d", "hot_100draws", "cold_30", "digit", "patterns"],
    at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const authResult = authorize(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: authResult.reason },
      { status: 401 }
    );
  }

  try {
    const result = await refreshAnalytics();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Refresh analytics failed",
      },
      { status: 500 }
    );
  }
}

/** Vercel Cron sends GET by default — accept GET with same auth */
export async function GET(request: Request) {
  return POST(request);
}
