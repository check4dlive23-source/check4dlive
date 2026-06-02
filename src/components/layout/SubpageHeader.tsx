"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { MainNav } from "@/components/layout/MainNav";
import { LuckyModal } from "@/components/ui/LuckyModal";
import { useLang } from "@/lib/language-context";

export function SubpageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const { t } = useLang();
  const [luckyOpen, setLuckyOpen] = useState(false);

  return (
    <>
      <header className="border-b border-line bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-surface-3 border border-line hover:border-gold/50 hover:text-gold transition-colors"
              >
                {t("home")}
              </Link>
              <MainNav />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLuckyOpen(true)}
                className="rounded-lg border border-line-strong bg-surface-3 px-3 py-1.5 text-sm text-foreground hover:bg-surface-4 transition-colors"
                aria-haspopup="dialog"
              >
                {t("lucky")}
              </button>
              <LanguageToggle />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          {children}
        </div>
      </header>
      <LuckyModal open={luckyOpen} onClose={() => setLuckyOpen(false)} />
    </>
  );
}
