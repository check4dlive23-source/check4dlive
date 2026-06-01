"use client";

import Link from "next/link";
import { useState } from "react";
import { SubpageHeader } from "@/components/layout/SubpageHeader";
import { HeatBadge } from "@/components/number/HeatBadge";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type { SearchResultRow } from "@/types/analytics";

const POPULAR_NUMBERS = [
  "8888",
  "1688",
  "1234",
  "0000",
  "7777",
  "3333",
  "6666",
  "9999",
  "5555",
  "1111",
];

const OPERATOR_LABELS: Record<string, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Toto",
  sabah: "Sabah",
  sarawak: "STC",
  sandakan: "Sandakan",
  gd: "GD",
  perdana: "PD",
  hari: "HH",
  sgpools: "SG",
};

export function NumberSearch() {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SearchResultRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    setSearched(true);
    setQuery(trimmed);
    const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setLoading(false);
  };

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    runSearch(query);
  };

  return (
    <div className="min-h-screen bg-surface">
      <SubpageHeader title={t("smartSearch")} subtitle={t("searchSubtitle")} />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            value={query}
            onChange={(e) =>
              setQuery(e.target.value.replace(/[^0-9*?]/g, "").slice(0, 4))
            }
            placeholder={t("searchPlaceholder")}
            className="flex-1 rounded-xl border border-line-strong bg-surface-3 px-4 py-3 font-number text-3xl tracking-[0.3em] text-center text-gold placeholder:text-dim focus:outline-none focus:border-gold/50"
            maxLength={4}
          />
          <button
            type="submit"
            disabled={query.trim().length < 2}
            className="rounded-xl bg-gold/20 border border-gold/40 px-6 py-3 text-sm font-semibold text-gold hover:bg-gold/30 disabled:opacity-40"
          >
            {t("search")}
          </button>
        </form>

        <p className="text-xs text-muted mt-2">{t("searchExamples")}</p>
        <p className="text-xs text-dim mt-1">{t("searchTips")}</p>

        <section className="mt-6">
          <h2 className="text-xs font-semibold text-muted uppercase mb-2">
            {t("popularSearches")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_NUMBERS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => runSearch(n)}
                className="font-number rounded-full border border-line bg-surface-3 px-3 py-1 text-sm text-gold hover:border-gold/50"
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {loading && <p className="text-sm text-muted mt-4">{t("searching")}</p>}

        {searched && !loading && (
          <div className="mt-6 space-y-3">
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted text-center rounded-xl border border-line bg-surface-2">
                {t("noResults")}
              </p>
            ) : (
              rows.map((row) => (
                <Link
                  key={row.number}
                  href={`/number/${row.number}`}
                  className="block rounded-xl border border-line bg-surface-2 p-4 hover:border-gold/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-number text-3xl text-gold">
                      {row.number}
                    </span>
                    <HeatBadge level={row.heat_level} />
                  </div>
                  <p className="text-sm text-muted mt-2">
                    {t("totalHits")}:{" "}
                    <span className="font-number text-foreground">
                      {row.total_hits}
                    </span>
                    {" · "}
                    {t("lastSeen")}:{" "}
                    {row.last_seen
                      ? formatDrawDate(row.last_seen)
                      : "—"}
                  </p>
                  <p className="text-xs text-dim mt-1">
                    {Object.entries(row.operators)
                      .map(
                        ([op, n]) =>
                          `${OPERATOR_LABELS[op] ?? op}: ${n}`
                      )
                      .join(" · ") || "—"}
                  </p>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
