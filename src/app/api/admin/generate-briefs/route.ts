import { generateAllBriefs } from "@/lib/vyra/generate-briefs";
import { NextResponse } from "next/server";

function authorize(request: Request): { ok: true } | { ok: false; reason: string } {
  const secret = process.env.INGEST_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return {
      ok: false,
      reason: "INGEST_SECRET is not set.",
    };
  }
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || auth.slice(7) !== secret) {
    return { ok: false, reason: "Invalid or missing Bearer token." };
  }
  return { ok: true };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authResult = authorize(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: authResult.reason },
      { status: 401 }
    );
  }

  try {
    const results = await generateAllBriefs();
    const failed = Object.entries(results).filter(([, v]) => !v.ok);
    return NextResponse.json({
      ok: failed.length === 0,
      results,
      failed: failed.length,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "generate-briefs failed",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
