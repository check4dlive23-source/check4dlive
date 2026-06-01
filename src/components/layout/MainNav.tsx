"use client";

import Link from "next/link";
import { useLang } from "@/lib/language-context";

const linkClass =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-surface-3 border border-line hover:border-gold/50 hover:text-gold transition-colors";

export function MainNav() {
  const { t } = useLang();

  return (
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
  );
}
