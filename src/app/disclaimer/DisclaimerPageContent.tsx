"use client";

import Link from "next/link";
import { useLang } from "@/lib/language-context";

const FULL_KEYS = [
  "disclaimerP1",
  "disclaimerP2",
  "disclaimerP3",
  "disclaimerP4",
  "disclaimerP5",
] as const;

export function DisclaimerPageContent() {
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
        {t("disclaimerPageTitle")}
      </h1>
      <div className="space-y-4 text-sm leading-relaxed">
        {FULL_KEYS.map((key) => (
          <p key={key}>{t(key)}</p>
        ))}
      </div>
      <p className="mt-8 text-xs" style={{ color: "var(--text-dim)" }}>
        <Link href="/" className="hover:text-white/60 underline-offset-2 hover:underline">
          ← {t("home")}
        </Link>
      </p>
    </div>
  );
}
