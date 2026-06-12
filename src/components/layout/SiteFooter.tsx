"use client";

import Link from "next/link";
import { useLang } from "@/lib/language-context";

const SHORT_KEYS = [
  "disclaimerShort1",
  "disclaimerShort2",
  "disclaimerShort3",
  "disclaimerShort4",
] as const;

export function SiteFooter() {
  const { t } = useLang();

  return (
    <footer
      className="border-t border-white/5 px-4 py-5 pb-24 text-xs lg:pb-6 lg:pl-48"
      style={{ color: "var(--text-dim)" }}
    >
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="space-y-1.5 leading-relaxed">
          {SHORT_KEYS.map((key) => (
            <p key={key}>{t(key)}</p>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/disclaimer"
            className="hover:text-white/60 transition-colors underline-offset-2 hover:underline"
          >
            {t("disclaimerFullLink")}
          </Link>
          <span aria-hidden className="text-white/15">
            ·
          </span>
          <Link
            href="/faq"
            className="hover:text-white/60 transition-colors underline-offset-2 hover:underline"
          >
            {t("faqLink")}
          </Link>
        </div>
        <p className="text-[10px] tracking-wide text-white/25">
          © 2026 Check4D Terminal · 18+
        </p>
      </div>
    </footer>
  );
}
