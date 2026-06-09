"use client";

import type { ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  titleAccent: string;
  subtitle: string;
  showBack?: boolean;
  rightAction?: ReactNode;
  children: ReactNode;
}

export function PageLayout({
  title,
  titleAccent,
  subtitle,
  showBack,
  rightAction,
  children,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#070710" }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,229,255,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        className="mx-auto w-full max-w-[390px] lg:max-w-3xl"
        style={{
          position: "relative",
          zIndex: 1,
          paddingTop: 72,
          paddingBottom: 100,
        }}
      >
        <div style={{ padding: "0 22px", marginBottom: 24 }}>
          {showBack && (
            <button
              type="button"
              onClick={() => window.history.back()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: "rgba(0,229,255,0.7)",
                fontFamily: "var(--font-jetbrains)",
                fontSize: 11,
                letterSpacing: "0.08em",
                cursor: "pointer",
                padding: "0 0 14px 0",
              }}
            >
              ← BACK
            </button>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "var(--font-jetbrains)", fontSize: 22, fontWeight: 900, letterSpacing: "0.08em", color: "#fff" }}>
                {title}<span style={{ color: "#00E5FF" }}>{titleAccent}</span>
              </div>
              <div style={{ fontFamily: "var(--font-jetbrains)", fontSize: 8, letterSpacing: "0.35em", color: "rgba(0,229,255,0.5)", marginTop: 3 }}>
                {subtitle}
              </div>
            </div>
            {rightAction && (
              <div style={{ flexShrink: 0, paddingTop: 4 }}>
                {rightAction}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "0 22px" }}>{children}</div>
      </div>
    </div>
  );
}
