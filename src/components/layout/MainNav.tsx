"use client";

import Link from "next/link";
import { useLang } from "@/lib/language-context";

const linkClass =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-surface-3 border border-line hover:border-gold/50 hover:text-gold transition-colors";

const mobileNavClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-muted hover:text-gold transition-colors active:text-gold";

export function MainNav() {
  const { t } = useLang();

  return (
    <>
      <nav className="hidden sm:flex items-center gap-2">
        <Link href="/analytics" className={linkClass}>
          {t("analytics")}
        </Link>
        <Link href="/draws" className={linkClass}>
          {t("draws")}
        </Link>
        <Link href="/search" className={linkClass}>
          {t("search")}
        </Link>
      </nav>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden bg-surface border-t border-line pb-safe"
        aria-label="Main navigation"
      >
        <Link href="/" className={mobileNavClass}>
          <span className="text-lg" aria-hidden>
            🏠
          </span>
          <span className="text-[10px]">{t("home")}</span>
        </Link>
        <Link href="/analytics" className={mobileNavClass}>
          <span className="text-lg" aria-hidden>
            📊
          </span>
          <span className="text-[10px]">{t("analytics")}</span>
        </Link>
        <Link href="/draws" className={mobileNavClass}>
          <span className="text-lg" aria-hidden>
            🎰
          </span>
          <span className="text-[10px]">{t("draws")}</span>
        </Link>
        <Link href="/search" className={mobileNavClass}>
          <span className="text-lg" aria-hidden>
            🔍
          </span>
          <span className="text-[10px]">{t("search")}</span>
        </Link>
      </nav>
    </>
  );
}
