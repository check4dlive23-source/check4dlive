"use client";

import type { ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  titleAccent: string;
  subtitle: string;
  children: ReactNode;
}

export function PageLayout({
  title,
  titleAccent,
  subtitle,
  children,
}: PageLayoutProps) {
  return (
    <div
      className="relative mx-auto min-h-screen w-full max-w-[390px] lg:max-w-3xl"
      style={{ backgroundColor: "#070710" }}
    >
      <div
        style={{
          position: "absolute",
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
        style={{
          position: "relative",
          zIndex: 1,
          paddingTop: 72,
          paddingBottom: 100,
        }}
      >
        <div style={{ padding: "0 22px", marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#fff",
            }}
          >
            {title}
            <span style={{ color: "#00E5FF" }}>{titleAccent}</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: 8,
              letterSpacing: "0.35em",
              color: "rgba(0,229,255,0.5)",
              marginTop: 3,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div style={{ padding: "0 22px" }}>{children}</div>
      </div>
    </div>
  );
}
