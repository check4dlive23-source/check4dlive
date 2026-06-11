"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";

interface Props {
  number: string;
}

export function WatchButton({ number }: Props) {
  const { t } = useLang();
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [limitMsg, setLimitMsg] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data: { numbers?: { number: string }[] }) => {
        if (cancelled) return;
        const nums = (data.numbers ?? []).map((row) => row.number);
        setWatching(nums.includes(number));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [number]);

  const toggle = async () => {
    setLoading(true);
    setLimitMsg(false);
    try {
      if (watching) {
        const res = await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number }),
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (res.ok) setWatching(false);
      } else {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number }),
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (res.status === 403) {
          setLimitMsg(true);
          return;
        }
        if (res.ok) setWatching(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="rounded-lg border border-line bg-surface-3 px-3 py-1.5 text-xs text-muted hover:border-gold/50 hover:text-gold disabled:opacity-60"
      >
        {loading ? t("loginLoading") : watching ? t("watchAdded") : t("watchAdd")}
      </button>
      {limitMsg && (
        <span
          className="max-w-[200px] text-center text-[10px] leading-snug"
          style={{ color: "var(--amber)" }}
        >
          {t("watchLimitReached")}
        </span>
      )}
    </div>
  );
}
