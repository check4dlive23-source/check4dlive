import { runIngest } from "@/jobs/ingest";
import { NextResponse } from "next/server";

function authorize(request: Request): { ok: true } | { ok: false; reason: string } {
  const secret =
    process.env.INGEST_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return {
      ok: false,
      reason:
        "INGEST_SECRET is not set. Add it to .env.local and restart npm run dev.",
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

export async function POST(request: Request) {
  const authResult = authorize(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: authResult.reason },
      { status: 401 }
    );
  }

  try {
    const result = await runIngest();
    return NextResponse.json({
      success: result.success,
      inserted: result.inserted,
      operators: result.operators,
      errors: result.errors,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Ingest failed",
      },
      { status: 500 }
    );
  }
}

/** Vercel Cron sends GET by default — accept GET with same auth */
export async function GET(request: Request) {
  return POST(request);
}
