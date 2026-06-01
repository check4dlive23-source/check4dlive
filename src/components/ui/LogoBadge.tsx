"use client";

import Image from "next/image";
import { useState } from "react";
import type { LogoKey } from "@/types";

interface LogoBadgeProps {
  operator: LogoKey | string;
  className?: string;
}

const LOGO_FILES: Record<string, string> = {
  magnum: "/logos/magnum.gif",
  damacai: "/logos/damacai.gif",
  toto: "/logos/toto.gif",
  toto_5d: "/logos/toto_5d.gif",
  toto_6d: "/logos/toto_6d.gif",
  toto_lotto: "/logos/toto_lotto.gif",
  magnum_jg: "/logos/magnum_jg.png",
  magnum_life: "/logos/magnum_life.png",
  gd: "/logos/gd.jpg",
  sabah: "/logos/sabah88.gif",
  sarawak: "/logos/cashsweep.gif",
  sandakan: "/logos/sandakan.gif",
  sgpools: "/logos/sgpools.gif",
  perdana: "/logos/perdana.png",
};

const HARI_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#065f46"/>
  <circle cx="20" cy="16" r="6" fill="#fde68a"/>
  <line x1="20" y1="6" x2="20" y2="9" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>
  <line x1="20" y1="23" x2="20" y2="26" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>
  <line x1="10" y1="16" x2="13" y2="16" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>
  <line x1="27" y1="16" x2="30" y2="16" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>
  <line x1="13" y1="9" x2="15" y2="11" stroke="#fde68a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="25" y1="21" x2="27" y2="23" stroke="#fde68a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="27" y1="9" x2="25" y2="11" stroke="#fde68a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="13" y1="21" x2="15" y2="23" stroke="#fde68a" stroke-width="1.5" stroke-linecap="round"/>
  <text x="20" y="35" font-family="Arial,sans-serif" font-size="5" font-weight="700" 
        text-anchor="middle" fill="rgba(255,255,255,0.85)">LUCKY HH</text>
</svg>`;

const HARI_SRC = `data:image/svg+xml,${encodeURIComponent(HARI_SVG)}`;

const COLORS: Record<string, string> = {
  perdana: "#5b21b6",
  hari: "#065f46",
};

const LABELS: Record<string, string> = {
  perdana: "PD",
  hari: "HH",
};

function FallbackPill({
  operatorKey,
  className,
}: {
  operatorKey: string;
  className: string;
}) {
  return (
    <div
      className={`shrink-0 rounded-lg ${className}`}
      style={{
        width: 40,
        height: 40,
        background: COLORS[operatorKey] ?? "#333",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 700,
        fontSize: 13,
        fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
      }}
    >
      {LABELS[operatorKey] ?? operatorKey.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function LogoBadge({ operator, className = "" }: LogoBadgeProps) {
  const key = String(operator).toLowerCase();
  const [failed, setFailed] = useState(false);

  if (key === "hari") {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-lg ${className}`}
        style={{ width: 40, height: 40 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HARI_SRC}
          alt="hari"
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const src = LOGO_FILES[key];

  if (!src || failed) {
    return <FallbackPill operatorKey={key} className={className} />;
  }

  const isGif = src.endsWith(".gif");

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-white/95 ${className}`}
      style={{ width: 40, height: 40 }}
    >
      {isGif ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={key}
          width={40}
          height={40}
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Image
          src={src}
          alt={key}
          width={40}
          height={40}
          unoptimized
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/** Resolve logo for Toto lotto games — never use toto_6d / main toto 4D logo */
export function resolveLottoLogo(data: {
  logoKey?: LogoKey;
  operator: string;
  displayName: string;
}): LogoKey | string {
  if (data.logoKey) return data.logoKey;
  const name = data.displayName.toLowerCase();
  if (
    name.includes("star") ||
    name.includes("power") ||
    name.includes("supreme") ||
    name.includes("6/50") ||
    name.includes("6/55") ||
    name.includes("6/58")
  ) {
    return "toto_lotto";
  }
  return data.operator;
}
