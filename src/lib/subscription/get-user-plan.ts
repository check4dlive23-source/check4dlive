import { createAuthServerClient } from "@/lib/supabase/auth-server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserPlan = "free" | "pro" | "elite";

type SubscriptionRow = {
  plan: string;
  billing_period: string | null;
  status: string | null;
  current_period_end: string | null;
};

function isPaidPlan(plan: string): plan is "pro" | "elite" {
  return plan === "pro" || plan === "elite";
}

/** Apply #54a rules to a subscription row (or null = no row). */
export function resolveUserPlan(row: SubscriptionRow | null): UserPlan {
  if (!row) return "free";
  if (row.plan === "free") return "free";

  // Lifetime: permanent; ignore current_period_end
  if (row.billing_period === "lifetime") {
    return isPaidPlan(row.plan) ? row.plan : "free";
  }

  if (row.status === "past_due") return "free";

  if (row.current_period_end) {
    const endMs = new Date(row.current_period_end).getTime();
    if (!Number.isNaN(endMs) && endMs <= Date.now()) return "free";
  }

  // active / canceled, not expired
  return isPaidPlan(row.plan) ? row.plan : "free";
}

/**
 * Read effective plan for a user. Server-only.
 * Default: auth server client + RLS. Pass service-role client for webhooks (#54c).
 */
export async function getUserPlan(
  userId: string,
  supabase?: SupabaseClient | null
): Promise<UserPlan> {
  const client = supabase ?? (await createAuthServerClient());
  if (!client) return "free";

  const { data, error } = await client
    .from("user_subscriptions")
    .select("plan, billing_period, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[getUserPlan] query failed:", error.message);
    return "free";
  }

  return resolveUserPlan(data as SubscriptionRow | null);
}

/** Current session user's effective plan; unauthenticated → 'free'. */
export async function getSessionPlan(): Promise<UserPlan> {
  const supabase = await createAuthServerClient();
  if (!supabase) return "free";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return "free";

  return getUserPlan(userData.user.id);
}
