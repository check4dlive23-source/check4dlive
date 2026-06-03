import {
  insertParsedDraws,
  parseCheck4dOrg,
} from "@/scripts/bulk-import";
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonWithCors(
  body: unknown,
  init?: { status?: number }
): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: corsHeaders,
  });
}

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const authResult = authorize(request);
  if (!authResult.ok) {
    return jsonWithCors(
      { error: "Unauthorized", reason: authResult.reason },
      { status: 401 }
    );
  }

  let body: { html?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(
      { error: "Invalid JSON body. Expected { html, date }" },
      { status: 400 }
    );
  }

  const html = body.html?.trim();
  const date = body.date?.trim();

  if (!html) {
    return jsonWithCors({ error: "Missing html" }, { status: 400 });
  }
  if (!date || !DATE_RE.test(date)) {
    return jsonWithCors(
      { error: "Missing or invalid date (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  try {
    const parsed = parseCheck4dOrg(html, date);
    const { inserted, operators } = await insertParsedDraws(parsed);

    return jsonWithCors({
      inserted,
      operators,
      date,
    });
  } catch (e) {
    return jsonWithCors(
      {
        error: e instanceof Error ? e.message : "Import failed",
        date,
      },
      { status: 500 }
    );
  }
}
