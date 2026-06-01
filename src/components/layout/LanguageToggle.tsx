"use client";

import { useLang } from "@/lib/language-context";

export function LanguageToggle() {
  const { lang, setLang } = useLang();

  const toggle = () => setLang(lang === "zh" ? "en" : "zh");

  return (
    <button
      type="button"
      onClick={toggle}
      className="px-3 py-1.5 rounded-full text-xs font-bold border border-line hover:border-gold/50 hover:text-gold transition-colors bg-surface-3"
      aria-label={lang === "zh" ? "Switch to English" : "切换到中文"}
    >
      {lang === "zh" ? "EN" : "中文"}
    </button>
  );
}
