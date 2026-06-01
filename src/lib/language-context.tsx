"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { translations, type Lang, type TranslationKey } from "./i18n";

const LanguageContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}>({
  lang: "zh",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");
  const t = (key: TranslationKey) => translations[lang][key] ?? key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
