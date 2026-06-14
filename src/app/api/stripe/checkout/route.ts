import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { getStripe } from "@/lib/stripe/client";
import {
  STRIPE_CHECKOUT,
  isCheckoutPlan,
  siteBaseUrl,
} from "@/lib/stripe/config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createAuthServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const plan: unknown = body?.plan;
  if (!isCheckoutPlan(plan)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  // TODO #54c webhook: founding lifetime cap — reject if COUNT(lifetime) >= 100

  const cfg = STRIPE_CHECKOUT[plan];
  const base = siteBaseUrl();
  const user = userData.user;

  try {
    const stripe = getStripe();

    const metadata = {
      supabase_user_id: user.id,
      billing_period: cfg.billingPeriod,
      plan: "pro",
    };

    const session = await stripe.checkout.sessions.create({
      mode: cfg.mode,
      line_items: [{ price: cfg.priceId, quantity: 1 }],
      success_url: `${base}/pro?success=1`,
      cancel_url: `${base}/pro?canceled=1`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata,
      ...(cfg.mode === "subscription"
        ? {
            subscription_data: {
              metadata,
            },
          }
        : {
            payment_intent_data: {
              metadata,
            },
          }),
    });

    if (!session.url) {
      return NextResponse.json({ error: "no_checkout_url" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/checkout]", e);
    return NextResponse.json(
      {
        error: "checkout_failed",
        message: e instanceof Error ? e.message : "checkout failed",
      },
      { status: 500 }
    );
  }
}
