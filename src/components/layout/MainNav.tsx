"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthNavWidget } from "@/components/auth/AuthNavWidget";
import { LanguageToggle } from "./LanguageToggle";
import { useViewportBottomFix } from "@/hooks/useViewportBottomFix";
import { isRegionLiveDraw } from "@/lib/draw-time";
import { useLang } from "@/lib/language-context";
import type { Region } from "@/types";

const REGIONS: Region[] = ["west", "east", "singapore"];

/** True when any region is currently in its live-draw window (client-only). */
function useAnyRegionLive(): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const check = () => setLive(REGIONS.some((r) => isRegionLiveDraw(r)));
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);
  return live;
}

type IconProps = { className?: string };

function IconAnalytics({ className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="12" y1="20" x2="12" y2="7" />
      <line x1="18" y1="20" x2="18" y2="10" />
    </svg>
  );
}

function IconLive({ className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 12 7 12 10 4 14 20 17 12 21 12" />
    </svg>
  );
}

function IconRankings({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="20" x2="5" y2="14" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="19" y1="20" x2="19" y2="12" />
    </svg>
  );
}

function IconHome({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconTrophy({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4H4a1 1 0 00-1 1v2a4 4 0 004 4h1" />
      <path d="M17 4h3a1 1 0 011 1v2a4 4 0 01-4 4h-1" />
      <path d="M7 4h10v8a5 5 0 01-10 0V4z" />
    </svg>
  );
}

function IconBroadcast({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 010 8.49" />
      <path d="M7.76 7.76a6 6 0 000 8.49" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
      <path d="M4.93 4.93a10 10 0 000 14.14" />
    </svg>
  );
}

function isMobileIntelActive(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/number");
}

function isDesktopIntelActive(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/number") ||
    pathname.startsWith("/draws")
  );
}

function isLiveActive(pathname: string): boolean {
  return pathname === "/live";
}

function isRankingsActive(pathname: string): boolean {
  return pathname === "/rankings" || pathname.startsWith("/rankings");
}

const DESKTOP_NAV = [
  {
    href: "/",
    label: "INTEL",
    Icon: IconAnalytics,
    isActive: isDesktopIntelActive,
    showLiveDot: false,
  },
  {
    href: "/live",
    label: "LIVE",
    Icon: IconLive,
    isActive: isLiveActive,
    showLiveDot: true,
  },
  {
    href: "/rankings",
    label: "RANKINGS",
    Icon: IconRankings,
    isActive: isRankingsActive,
    showLiveDot: false,
  },
] as const;

export function MainNav() {
  const { t } = useLang();
  const pathname = usePathname();
  const live = useAnyRegionLive();
  const mobileNavRef = useRef<HTMLElement>(null);
  useViewportBottomFix(mobileNavRef);

  const MOBILE_TABS = [
    {
      href: "/",
      label: t("home"),
      Icon: IconHome,
      showLiveDot: false,
      isActive: isMobileIntelActive,
    },
    {
      href: "/rankings",
      label: t("rankings"),
      Icon: IconTrophy,
      showLiveDot: false,
      isActive: isRankingsActive,
    },
    {
      href: "/live",
      label: t("liveDraws"),
      Icon: IconBroadcast,
      showLiveDot: true,
      isActive: isLiveActive,
    },
  ] as const;

  return (
    <>
      {/* Desktop left sidebar */}
      <nav
        className="fixed left-0 top-0 z-40 hidden h-screen w-48 flex-col lg:flex"
        style={{
          backgroundColor: "var(--surface-2)",
          borderRight: "1px solid var(--border-dim)",
        }}
        aria-label="Main navigation"
      >
        <div
          className="flex items-start justify-between gap-2 border-b px-5 py-6"
          style={{ borderColor: "var(--border-dim)" }}
        >
          <Link href="/" style={{ lineHeight: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "18px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                color: "#fff",
              }}
            >
              CHECK<span style={{ color: "#00E5FF" }}>4D</span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "8px",
                fontWeight: 400,
                letterSpacing: "0.35em",
                color: "rgba(0,229,255,0.6)",
                marginTop: "2px",
              }}
            >
              TERMINAL
            </div>
          </Link>
          <LanguageToggle />
        </div>

        <div className="flex flex-col gap-1 px-3 py-4">
          {DESKTOP_NAV.map(({ href, label, Icon, isActive, showLiveDot }) => {
            const active = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 font-sans text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? ""
                    : "hover:text-[var(--text-secondary)]"
                }`}
                style={{
                  color: active ? "var(--cyan)" : "var(--text-dim)",
                  backgroundColor: active
                    ? "rgba(0,229,255,0.06)"
                    : "transparent",
                  borderLeft: active
                    ? "2px solid var(--cyan)"
                    : "2px solid transparent",
                }}
              >
                <span className="relative shrink-0">
                  <Icon className="h-4 w-4" />
                  {showLiveDot && live && (
                    <span
                      className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: "var(--green)" }}
                    />
                  )}
                </span>
                {label}
              </Link>
            );
          })}
        </div>

        <div
          className="mt-auto border-t"
          style={{ borderColor: "var(--border-dim)" }}
        >
          <AuthNavWidget variant="desktop" />
        </div>

        <div
          className="border-t px-5 py-4"
          style={{ borderColor: "var(--border-dim)" }}
        >
          <p
            className="text-[9px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-dim)" }}
          >
            MY · SG · KH
          </p>
          {live ? (
            <p
              className="mt-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.08em]"
              style={{ color: "var(--green)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--green)" }}
              />
              LIVE NOW
            </p>
          ) : (
            <p
              className="mt-1 text-[9px] uppercase tracking-[0.08em]"
              style={{ color: "var(--text-dim)" }}
            >
              OFFLINE
            </p>
          )}
        </div>
      </nav>

      {/* Mobile auth + language toggle — top right */}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2 lg:hidden">
        <AuthNavWidget variant="mobile" />
        <LanguageToggle />
      </div>

      {/* Mobile bottom bar */}
      <nav
        ref={mobileNavRef}
        className="z-50 flex h-16 pb-safe lg:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(7,7,16,0.97)",
          borderTop: "1px solid var(--border-dim)",
        }}
        aria-label="Main navigation"
      >
        {MOBILE_TABS.map(({ href, label, Icon, showLiveDot, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
              style={{
                color: active ? "var(--cyan)" : "rgba(255,255,255,0.35)",
              }}
            >
              <span className="relative">
                <Icon className="h-6 w-6" />
                {showLiveDot && live && (
                  <span
                    className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--green)" }}
                  />
                )}
              </span>
              <span className="font-sans text-[10px] leading-none tracking-wide">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
