import { getSessionPlan } from "@/lib/subscription/get-user-plan";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET: current user's effective plan (client-safe read). */
export async function GET() {
  const plan = await getSessionPlan();
  return NextResponse.json({ plan });
}
