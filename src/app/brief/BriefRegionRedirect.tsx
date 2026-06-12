"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "vyra-brief-region";

export function BriefRegionRedirect() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const region =
      saved === "east" || saved === "singapore" ? saved : "west";
    router.replace(`/brief/${region}`);
  }, [router]);

  return (
    <div
      className="mx-auto max-w-2xl px-4 py-16 text-center text-sm"
      style={{ color: "rgba(255,255,255,0.4)" }}
    >
      …
    </div>
  );
}

export function saveBriefRegion(region: string) {
  try {
    localStorage.setItem(STORAGE_KEY, region);
  } catch {
    /* ignore */
  }
}
