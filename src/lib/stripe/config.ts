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
