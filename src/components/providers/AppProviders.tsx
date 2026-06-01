"use client";

import { LanguageProvider } from "@/lib/language-context";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
