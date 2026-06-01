"use client";

import Link from "next/link";
import { useState } from "react";
import { SubpageHeader } from "@/components/layout/SubpageHeader";
import { HeatBadge } from "@/components/number/HeatBadge";
import type { SearchResultRow } from "@/types/analytics";

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
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SearchResultRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface">
      <SubpageHeader
        title="Number Search"
        subtitle="Wildcard search: use * or ? for any digit (e.g. 12**, *888, 88??)"
      />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <form onSubmit={runSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value.replace(/[^0-9*?]/g, "").slice(0, 4)
              )
            }
            placeholder="1234 or 12**"
            className="flex-1 rounded-xl border border-line-strong bg-surface-3 px-4 py-3 font-number text-3xl tracking-[0.3em] text-center text-gold placeholder:text-dim focus:outline-none focus:border-gold/50"
            maxLength={4}
          />
          <button
            type="submit"
            disabled={query.trim().length < 2}
            className="rounded-xl bg-gold/20 border border-gold/40 px-6 py-3 text-sm font-semibold text-gold hover:bg-gold/30 disabled:opacity-40"
          >
            Search
          </button>
        </form>

        {loading && <p className="text-sm text-muted mt-4">Searching…</p>}

        {searched && !loading && (
          <div className="mt-6 rounded-xl border border-line bg-surface-2 overflow-x-auto">
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted text-center">No matching numbers.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted uppercase border-b border-line">
                    <th className="px-3 py-2 text-left">Number</th>
                    <th className="px-3 py-2 text-center">Hits</th>
                    <th className="px-3 py-2 text-left">Last seen</th>
                    <th className="px-3 py-2 text-left">Heat</th>
                    <th className="px-3 py-2 text-left">Operators</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.number} className="border-b border-line/50">
                      <td className="px-3 py-2">
                        <Link
                          href={`/number/${row.number}`}
                          className="font-number text-lg text-gold hover:underline"
                        >
                          {row.number}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-center font-number">
                        {row.total_hits}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {row.last_seen ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <HeatBadge level={row.heat_level} />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {Object.entries(row.operators)
                          .map(
                            ([op, n]) =>
                              `${OPERATOR_LABELS[op] ?? op}:${n}`
                          )
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
