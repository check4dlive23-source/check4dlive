import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importCheck4dOperatorHistory } from "@/lib/ingest/check4d-org-v2";
import type { OperatorId } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5分钟，需要 Vercel Pro

const ALLOWED_OPERATORS: OperatorId[] = ["sabah", "sandakan", "sarawak", "sgpools", "magnum", "damacai", "toto"];

function authorize(request: Request): boolean {
  const secret = process.env.INGEST_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { operator?: string; from?: string; to?: string; delay?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { operator, from, to, delay = 300 } = body;

  if (!operator || !ALLOWED_OPERATORS.includes(operator as OperatorId)) {
    return NextResponse.json({ error: `Invalid operator. Allowed: ${ALLOWED_OPERATORS.join(", ")}` }, { status: 400 });
  }
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required (YYYY-MM-DD)" }, { status: 400 });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
  }

  const op = operator as OperatorId;

  try {
    const result = await importCheck4dOperatorHistory(
      supabase,
      op,
      from,
      to,
      delay,
      op
    );
    return NextResponse.json({
      ok: true,
      operator,
      from,
      to,
      ...result,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
