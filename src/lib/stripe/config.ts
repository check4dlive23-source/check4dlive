export type CheckoutPlan = "monthly" | "yearly" | "lifetime";

export type CheckoutMode = "subscription" | "payment";

export const STRIPE_CHECKOUT: Record<
  CheckoutPlan,
  { priceId: string; mode: CheckoutMode; billingPeriod: CheckoutPlan }
> = {
  monthly: {
    priceId: "price_1Ti9ljJdT63rMGSf2b5EQcPt",
    mode: "subscription",
    billingPeriod: "monthly",
  },
  yearly: {
    priceId: "price_1Ti9oLJdT63rMGSfbYiKLmMN",
    mode: "subscription",
    billingPeriod: "yearly",
  },
  lifetime: {
    priceId: "price_1Ti9pWJdT63rMGSfdMupkvAy",
    mode: "payment",
    billingPeriod: "lifetime",
  },
};

/** Live Price IDs (reverse lookup for webhooks). */
export const STRIPE_PRICE_IDS = {
  monthly: STRIPE_CHECKOUT.monthly.priceId,
  yearly: STRIPE_CHECKOUT.yearly.priceId,
  lifetime: STRIPE_CHECKOUT.lifetime.priceId,
} as const;

/** Reverse lookup: Stripe Price ID → billing_period */
export function billingPeriodFromPriceId(priceId: string): CheckoutPlan | null {
  for (const plan of Object.keys(STRIPE_CHECKOUT) as CheckoutPlan[]) {
    if (STRIPE_CHECKOUT[plan].priceId === priceId) return plan;
  }
  return null;
}

export function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return value === "monthly" || value === "yearly" || value === "lifetime";
}

export function siteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "https://check4dterminal.com";
}
