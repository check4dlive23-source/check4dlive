import { runLiveCronIngest } from "@/lib/live-results";
import { NextResponse } from "next/server";

function authorize(request: Request): { ok: true } | { ok: false; reason: string } {
  const secret = process.env.INGEST_SECRET ?? process.env.CRON_SECRET;
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleLiveIngest(request: Request) {
  const authResult = authorize(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: authResult.reason },
      { status: 401 }
    );
  }

  try {
    const result = await runLiveCronIngest();

    if (result.skipped) {
      return NextResponse.json({ skipped: true });
    }

    if (result.error) {
      return NextResponse.json(
        {
          skipped: false,
          scraped: result.scraped,
          operators: result.operators,
          date: result.date,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      skipped: false,
      scraped: result.scraped,
      operators: result.operators,
      date: result.date,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Live ingest failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleLiveIngest(request);
}

/** Vercel Cron sends GET by default */
export async function GET(request: Request) {
  return handleLiveIngest(request);
}
