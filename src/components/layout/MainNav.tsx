"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isRegionLiveDraw } from "@/lib/draw-time";
import type { Region } from "@/types";

const REGIONS: Region[] = ["west", "east", "cambodia", "singapore"];

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

function IconAnalytics({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
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

function IconRecords({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}

function IconSearch({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconLive({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
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

const DESKTOP_LINKS = [
  { href: "/analytics", label: "分析" },
  { href: "/draws", label: "开彩记录" },
  { href: "/search", label: "搜索" },
] as const;

const MOBILE_TABS = [
  { href: "/analytics", label: "分析", Icon: IconAnalytics, live: false },
  { href: "/draws", label: "记录", Icon: IconRecords, live: false },
  { href: "/search", label: "搜索", Icon: IconSearch, live: false },
  { href: "/live", label: "实时", Icon: IconLive, live: true },
] as const;

export function MainNav() {
  const pathname = usePathname();
  const live = useAnyRegionLive();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Desktop top bar */}
      <nav className="fixed inset-x-0 top-0 z-40 hidden h-14 items-center justify-between gap-6 border-b border-[var(--border-dim)] bg-[var(--surface-2)] px-4 sm:flex">
        <Link
          href="/"
          className="font-[family-name:var(--font-mono)] text-base font-bold tracking-tight text-[var(--text-primary)]"
        >
          Check4D
        </Link>

        <div className="flex items-center gap-6">
          {DESKTOP_LINKS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 pb-0.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-[var(--accent-green)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <Link
          href="/live"
          className="inline-flex items-center gap-1.5 text-sm font-medium"
        >
          {live ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--accent-amber)]">
              实时开彩
              <span className="h-2 w-2 rounded-full bg-[var(--accent-amber)] animate-pulse" />
            </span>
          ) : (
            <span className="text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-colors">
              开彩时间表
            </span>
          )}
        </Link>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex h-14 sm:hidden border-t border-[var(--border-dim)] bg-[var(--surface-2)] pb-safe"
        aria-label="Main navigation"
      >
        {MOBILE_TABS.map(({ href, label, Icon, live: isLiveTab }) => {
          const active = isActive(href);
          const showLiveDot = isLiveTab && live;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
              style={{
                color: active
                  ? "var(--accent-green)"
                  : "var(--text-secondary)",
              }}
            >
              <span className="relative">
                <Icon />
                {showLiveDot && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-[var(--accent-amber)] animate-pulse" />
                )}
              </span>
              <span className="text-[10px] leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
