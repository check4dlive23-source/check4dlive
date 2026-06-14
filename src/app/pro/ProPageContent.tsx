"use client";

import Link from "next/link";
import { useLang } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";

type BillingPlan = "monthly" | "yearly" | "lifetime";

const PURPLE = "#A78BFA";
const AMBER = "#FFB020";

const FREE_FEATURES: TranslationKey[] = [
  "proFeatureSearch",
  "proFeatureNumberBasic",
  "proFeatureHotCold",
  "proFeatureBrief2",
  "proFeatureWatch5",
];

const PRO_FEATURES: TranslationKey[] = [
  "proFeatureSearch",
  "proFeatureNumberBasic",
  "proFeatureHotCold",
  "proFeatureBriefFull",
  "proFeatureReportFull",
  "proFeatureWatchUnlimited",
  "proFeatureVyraChat",
];

function handleUpgrade(plan: BillingPlan) {
  // TODO #54c: Stripe Checkout Session
  console.log("[pro] upgrade placeholder:", plan);
}

function dailyApprox(amount: number): string {
  return amount.toFixed(2);
}

export function ProPageContent() {
  const { t } = useLang();

  return (
    <div
      className="mx-auto max-w-2xl px-4 py-10 pb-28 lg:pb-12 lg:pl-52"
      style={{ color: "rgba(255,255,255,0.75)" }}
    >
      <header className="mb-8" style={{ borderLeft: `2px solid ${PURPLE}`, paddingLeft: 12 }}>
        <h1 className="text-lg font-bold tracking-wide" style={{ color: "white" }}>
          {t("proPageTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          {t("proPageSubtitle")}
        </p>
      </header>

      {/* Mobile: yearly first (order). Desktop: monthly | yearly | lifetime */}
      <div className="mb-10 flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-3">
        <PriceCard
          plan="monthly"
          label={t("proMonthlyLabel")}
          price={t("proMonthlyPrice")}
          period={t("proMonthlyPeriod")}
          dailyText={t("proDailyApprox").replace("{amount}", dailyApprox(29.9 / 30))}
          borderColor="rgba(167,139,250,0.2)"
          className="order-2 md:order-none"
          onUpgrade={handleUpgrade}
          upgradeLabel={t("proUpgradeBtn")}
        />

        <PriceCard
          plan="yearly"
          label={t("proYearlyLabel")}
          price={t("proYearlyPrice")}
          period={t("proYearlyPeriod")}
          dailyText={t("proDailyApprox").replace("{amount}", dailyApprox(239 / 365))}
          badge={t("proYearlyBadge")}
          saveNote={t("proYearlySave")}
          borderColor="rgba(255,176,32,0.5)"
          badgeColor={AMBER}
          highlighted
          className="order-1 md:order-none"
          onUpgrade={handleUpgrade}
          upgradeLabel={t("proUpgradeBtn")}
        />

        <PriceCard
          plan="lifetime"
          label={t("proLifetimeLabel")}
          price={t("proLifetimePrice")}
          period={t("proLifetimePeriod")}
          dailyText={t("proLifetimeNote")}
          badge={t("proLifetimeBadge")}
          borderColor="rgba(167,139,250,0.35)"
          dashed
          className="order-3 md:order-none"
          onUpgrade={handleUpgrade}
          upgradeLabel={t("proUpgradeBtn")}
        />
      </div>

      <section className="mb-8">
        <h2
          className="mb-4 text-sm font-bold tracking-wide"
          style={{ color: PURPLE, fontFamily: "var(--font-jetbrains)" }}
        >
          {t("proCompareTitle")}
        </h2>
        <div
          className="overflow-hidden rounded-xl"
          style={{
            border: "1px solid rgba(167,139,250,0.15)",
            background: "rgba(167,139,250,0.04)",
          }}
        >
          <div
            className="grid grid-cols-2 gap-2 px-4 py-3 text-xs font-semibold"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "var(--font-jetbrains)",
              letterSpacing: "0.06em",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.45)" }}>{t("proCompareFree")}</span>
            <span style={{ color: PURPLE }}>{t("proComparePro")}</span>
          </div>

          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="mb-2 text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
              {t("proCompareFree")}
            </p>
            <ul className="space-y-2 text-sm">
              {FREE_FEATURES.map((key) => (
                <li key={key} className="flex gap-2">
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>✓</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-4 py-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider" style={{ color: PURPLE }}>
              {t("proComparePro")}
            </p>
            <ul className="space-y-2 text-sm">
              {PRO_FEATURES.map((key) => (
                <li key={key} className="flex gap-2">
                  <span style={{ color: PURPLE }}>✓</span>
                  <span style={{ color: "rgba(255,255,255,0.85)" }}>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <p className="mb-6 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
        {t("proFootnote")}
      </p>

      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
        <Link href="/" className="hover:text-white/60 underline-offset-2 hover:underline">
          ← {t("home")}
        </Link>
      </p>
    </div>
  );
}

function PriceCard({
  plan,
  label,
  price,
  period,
  dailyText,
  badge,
  saveNote,
  borderColor,
  badgeColor = PURPLE,
  highlighted,
  dashed,
  className,
  onUpgrade,
  upgradeLabel,
}: {
  plan: BillingPlan;
  label: string;
  price: string;
  period: string;
  dailyText: string;
  badge?: string;
  saveNote?: string;
  borderColor: string;
  badgeColor?: string;
  highlighted?: boolean;
  dashed?: boolean;
  className?: string;
  onUpgrade: (plan: BillingPlan) => void;
  upgradeLabel: string;
}) {
  return (
    <article
      className={`relative flex flex-col rounded-xl p-4 ${className ?? ""}`}
      style={{
        border: dashed ? `1px dashed ${borderColor}` : `1px solid ${borderColor}`,
        background: highlighted
          ? "linear-gradient(135deg, rgba(255,176,32,0.08), rgba(167,139,250,0.06))"
          : "rgba(167,139,250,0.05)",
        boxShadow: highlighted ? `0 0 0 1px rgba(255,176,32,0.15)` : undefined,
      }}
    >
      {badge && (
        <span
          className="mb-3 inline-block self-start rounded-full px-2.5 py-0.5 text-[10px] font-bold"
          style={{
            background: `${badgeColor}22`,
            border: `1px solid ${badgeColor}66`,
            color: badgeColor,
            fontFamily: "var(--font-jetbrains)",
            letterSpacing: "0.06em",
          }}
        >
          {badge}
        </span>
      )}

      <p
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-jetbrains)" }}
      >
        {label}
      </p>

      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="font-mono text-2xl font-bold tabular-nums"
          style={{ color: highlighted ? AMBER : PURPLE }}
        >
          {price}
        </span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          {period}
        </span>
      </div>

      <p className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        {dailyText}
      </p>

      {saveNote && (
        <p className="mt-2 text-[11px] leading-snug" style={{ color: AMBER }}>
          {saveNote}
        </p>
      )}

      <button
        type="button"
        onClick={() => onUpgrade(plan)}
        className="mt-4 w-full rounded-lg py-2.5 text-xs font-bold"
        style={{
          fontFamily: "var(--font-jetbrains)",
          letterSpacing: "0.06em",
          border: highlighted ? `1px solid ${AMBER}88` : `1px solid ${PURPLE}55`,
          background: highlighted ? "rgba(255,176,32,0.15)" : "rgba(167,139,250,0.12)",
          color: highlighted ? AMBER : PURPLE,
          cursor: "pointer",
        }}
      >
        {upgradeLabel}
      </button>
    </article>
  );
}
