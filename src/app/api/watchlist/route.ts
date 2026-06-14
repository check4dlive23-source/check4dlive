import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { getSessionPlan, isPaidMember } from "@/lib/subscription/get-user-plan";
import { NextResponse } from "next/server";

const FREE_LIMIT = 5;
const PRO_LIMIT = 9999;

/** GET:当前用户的关注列表(号码数组) */
export async function GET() {
  const supabase = await createAuthServerClient();
  if (!supabase) return NextResponse.json({ numbers: [] });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ numbers: [] });
  const { data } = await supabase
    .from("watchlists")
    .select("number, created_at")
    .order("created_at", { ascending: false });
  return NextResponse.json({ numbers: data ?? [] });
}

/** POST {number}:关注 */
export async function POST(request: Request) {
  const supabase = await createAuthServerClient();
  if (!supabase)
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const number = typeof body?.number === "string" ? body.number : "";
  if (!/^\d{4}$/.test(number))
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { count } = await supabase
    .from("watchlists")
    .select("id", { count: "exact", head: true });
  const plan = await getSessionPlan();
  const limit = isPaidMember(plan) ? PRO_LIMIT : FREE_LIMIT;
  if ((count ?? 0) >= limit)
    return NextResponse.json({ error: "limit" }, { status: 403 });

  const { error } = await supabase
    .from("watchlists")
    .insert({ user_id: userData.user.id, number });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE {number}:取消关注 */
export async function DELETE(request: Request) {
  const supabase = await createAuthServerClient();
  if (!supabase)
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const number = typeof body?.number === "string" ? body.number : "";
  if (!/^\d{4}$/.test(number))
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  await supabase.from("watchlists").delete().eq("number", number);
  return NextResponse.json({ ok: true });
}
