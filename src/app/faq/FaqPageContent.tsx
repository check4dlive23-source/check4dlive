"use client";

import Link from "next/link";
import { useLang } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";

const FAQ_ITEMS = Array.from({ length: 10 }, (_, i) => ({
  q: `faqQ${i + 1}` as TranslationKey,
  a: `faqA${i + 1}` as TranslationKey,
}));

export function FaqPageContent() {
  const { t } = useLang();

  return (
    <div
      className="mx-auto max-w-2xl px-4 py-10 pb-28 lg:pb-12 lg:pl-52"
      style={{ color: "rgba(255,255,255,0.75)" }}
    >
      <h1
        className="mb-6 text-lg font-bold tracking-wide"
        style={{ color: "white" }}
      >
        {t("faqPageTitle")}
      </h1>
      <div className="space-y-6 text-sm leading-relaxed">
        {FAQ_ITEMS.map(({ q, a }) => (
          <section key={q}>
            <h2
              className="mb-1.5 font-semibold"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              {t(q)}
            </h2>
            <p>{t(a)}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 text-xs" style={{ color: "var(--text-dim)" }}>
        <Link
          href="/disclaimer"
          className="hover:text-white/60 underline-offset-2 hover:underline"
        >
          {t("faqDisclaimerLink")}
        </Link>
      </p>
      <p className="mt-3 text-xs" style={{ color: "var(--text-dim)" }}>
        <Link
          href="/"
          className="hover:text-white/60 underline-offset-2 hover:underline"
        >
          ← {t("home")}
        </Link>
      </p>
    </div>
  );
}
