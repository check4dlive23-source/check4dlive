import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/client";
import {
  billingPeriodFromPriceId,
  type CheckoutPlan,
} from "@/lib/stripe/config";

type DbStatus = "active" | "canceled" | "past_due";

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

function unixToIso(sec: number | null | undefined): string | null {
  if (sec == null) return null;
  return new Date(sec * 1000).toISOString();
}

function mapStripeSubStatus(status: Stripe.Subscription.Status): DbStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "active";
}

/** Stripe API 2025+: period end lives on subscription items, not Subscription root. */
function subscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
  return sub.items.data[0]?.current_period_end ?? null;
}

async function upsertSubscription(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    plan: "pro";
    billing_period: CheckoutPlan;
    status: DbStatus;
    current_period_end: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  }
) {
  const { error } = await supabase.from("user_subscriptions").upsert(row, {
    onConflict: "user_id",
  });
  if (error) throw new Error(`user_subscriptions upsert: ${error.message}`);
}

async function getExisting(
  supabase: SupabaseClient,
  userId: string
): Promise<{ billing_period: string | null; status: string | null } | null> {
  const { data } = await supabase
    .from("user_subscriptions")
    .select("billing_period, status")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export function resolveUserIdFromSession(
  session: Stripe.Checkout.Session
): string | null {
  const fromMeta = session.metadata?.supabase_user_id;
  if (fromMeta && isUuid(fromMeta)) return fromMeta;
  const fromRef = session.client_reference_id;
  if (fromRef && isUuid(fromRef)) return fromRef;
  return null;
}

export async function resolveBillingPeriodFromSession(
  session: Stripe.Checkout.Session
): Promise<CheckoutPlan | null> {
  const meta = session.metadata?.billing_period;
  if (meta === "monthly" || meta === "yearly" || meta === "lifetime") return meta;
  if (session.mode === "payment") return "lifetime";

  const stripe = getStripe();
  const subId = session.subscription;
  if (typeof subId === "string") {
    const sub = await stripe.subscriptions.retrieve(subId);
    const priceId = sub.items.data[0]?.price?.id;
    if (priceId) return billingPeriodFromPriceId(priceId);
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 1,
  });
  const priceId = lineItems.data[0]?.price?.id;
  if (priceId) return billingPeriodFromPriceId(priceId);
  return null;
}

export async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  const userId = resolveUserIdFromSession(session);
  if (!userId) {
    console.error(
      "[stripe/webhook] checkout.session.completed: no user id",
      session.id
    );
    return;
  }

  const billingPeriod = await resolveBillingPeriodFromSession(session);
  if (!billingPeriod) {
    console.error(
      "[stripe/webhook] checkout.session.completed: unknown billing_period",
      session.id
    );
    return;
  }

  if (billingPeriod === "lifetime") {
    const { count } = await supabase
      .from("user_subscriptions")
      .select("user_id", { count: "exact", head: true })
      .eq("billing_period", "lifetime");
    if ((count ?? 0) >= 100) {
      console.warn(
        "[stripe/webhook] founding lifetime cap exceeded; honoring payment for",
        userId
      );
    }
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null);

  let subscriptionId: string | null = null;
  let periodEnd: string | null = null;

  if (session.mode === "subscription" && typeof session.subscription === "string") {
    subscriptionId = session.subscription;
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    periodEnd = unixToIso(subscriptionPeriodEnd(sub));
  }

  await upsertSubscription(supabase, {
    user_id: userId,
    plan: "pro",
    billing_period: billingPeriod,
    status: "active",
    current_period_end: periodEnd,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  });
}

async function findUserIdForSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<string | null> {
  const meta = subscription.metadata?.supabase_user_id;
  if (meta && isUuid(meta)) return meta;

  const { data: bySub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (bySub?.user_id) return bySub.user_id as string;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (customerId) {
    const { data: byCust } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (byCust?.user_id) return byCust.user_id as string;
  }
  return null;
}

export async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const userId = await findUserIdForSubscription(supabase, subscription);
  if (!userId) {
    console.warn(
      "[stripe/webhook] subscription.updated: unknown user",
      subscription.id
    );
    return;
  }

  const existing = await getExisting(supabase, userId);
  if (existing?.billing_period === "lifetime" && existing.status === "active") {
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const billingPeriod = priceId ? billingPeriodFromPriceId(priceId) : null;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);

  await upsertSubscription(supabase, {
    user_id: userId,
    plan: "pro",
    billing_period: billingPeriod ?? "monthly",
    status: mapStripeSubStatus(subscription.status),
    current_period_end: unixToIso(subscriptionPeriodEnd(subscription)),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
  });
}

export async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const userId = await findUserIdForSubscription(supabase, subscription);
  if (!userId) return;

  const existing = await getExisting(supabase, userId);
  if (existing?.billing_period === "lifetime" && existing.status === "active") {
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);

  await upsertSubscription(supabase, {
    user_id: userId,
    plan: "pro",
    billing_period: billingPeriodFromPriceId(priceId ?? "") ?? "monthly",
    status: "canceled",
    current_period_end: unixToIso(subscriptionPeriodEnd(subscription)),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
  });
}
