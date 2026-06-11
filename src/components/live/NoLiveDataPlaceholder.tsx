"use client";

import { useLang } from "@/lib/language-context";

export function NoLiveDataPlaceholder() {
  const { t } = useLang();
  return (
    <div
      style={{
        padding: "32px 14px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.25)",
          fontFamily: "var(--font-jetbrains)",
        }}
      >
        {t("noLiveData")}
      </p>
    </div>
  );
}
