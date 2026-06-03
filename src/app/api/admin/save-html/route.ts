import { insertParsedDraws, parseCheck4dOrg } from "@/scripts/bulk-import";
import { writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function jsonWithCors(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    ...init,
    headers: corsHeaders,
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
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
    writeFileSync(join(process.cwd(), "tmp-import.html"), html, "utf8");

    const draws = parseCheck4dOrg(html, date);
    if (!draws.length) {
      return jsonWithCors({ inserted: 0, operators: [], date });
    }

    const result = await insertParsedDraws(draws);

    return jsonWithCors({
      inserted: result.inserted,
      operators: result.operators,
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
