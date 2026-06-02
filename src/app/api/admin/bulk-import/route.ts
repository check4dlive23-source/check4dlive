import { bulkImportHistorical } from "@/scripts/bulk-import";
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
export const runtime = "nodejs";

async function startImport(request: Request) {
  const authResult = authorize(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: authResult.reason },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "2010-01-01";
  const to = url.searchParams.get("to") ?? new Date().toISOString().split("T")[0];

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to query params" },
      { status: 400 }
    );
  }

  const jobId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `job-${Date.now()}`;

  void bulkImportHistorical({
    from,
    to,
    jobId,
    onProgress: (msg) => console.log(msg),
  }).catch((e) => console.error(`[${jobId}] bulk import failed:`, e));

  return NextResponse.json({
    jobId,
    status: "started",
    from,
    to,
  });
}

export async function POST(request: Request) {
  return startImport(request);
}

/** Accept GET with same auth */
export async function GET(request: Request) {
  return startImport(request);
}

