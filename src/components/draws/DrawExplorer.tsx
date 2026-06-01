"use client";

import { useCallback, useEffect, useState } from "react";
import { SubpageHeader } from "@/components/layout/SubpageHeader";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import {
  CONSOLATION_SLOT_COUNT,
  padPrizeSlots,
  specialSlotCount,
} from "@/lib/prize-slots";
import { OPERATORS } from "@/lib/history-search";
import type { DrawListItem } from "@/types/analytics";

const OPERATOR_LABELS: Record<string, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Sports Toto",
  sabah: "Sabah",
  sarawak: "Cash Sweep",
  sandakan: "Sandakan",
  gd: "Grand Dragon",
  perdana: "Perdana",
  hari: "Lucky Hari Hari",
  sgpools: "Singapore Pools",
};

export function DrawExplorer() {
  const { t } = useLang();
  const [date, setDate] = useState("");
  const [operator, setOperator] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DrawListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<DrawListItem | null>(null);
  const [loading, setLoading] = useState(false);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (date) params.set("date", date);
    if (operator) params.set("operator", operator);
    const res = await fetch(`/api/history?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [date, operator, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-surface">
      <SubpageHeader
        title={t("drawExplorer")}
        subtitle={t("drawsSubtitle")}
      />

      <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs text-muted">
            {t("dateLabel")}
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              className="mt-1 block rounded-lg border border-line bg-surface-3 px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted">
            {t("operator")}
            <select
              value={operator}
              onChange={(e) => {
                setOperator(e.target.value);
                setPage(1);
              }}
              className="mt-1 block rounded-lg border border-line bg-surface-3 px-3 py-2 text-sm text-foreground min-w-[140px]"
            >
              <option value="">{t("allOperators")}</option>
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABELS[op] ?? op}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setDate("");
              setOperator("");
              setPage(1);
            }}
            className="rounded-lg border border-line px-3 py-2 text-xs text-muted hover:text-foreground"
          >
            {t("clearFilters")}
          </button>
        </div>

        {loading && <p className="text-sm text-muted">{t("loading")}</p>}

        <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted uppercase border-b border-line">
                <th className="px-3 py-2 text-left">{t("dateLabel")}</th>
                <th className="px-3 py-2 text-left">{t("operator")}</th>
                <th className="px-3 py-2 text-center">{t("firstHits")}</th>
                <th className="px-3 py-2 text-center">{t("secondHits")}</th>
                <th className="px-3 py-2 text-center">{t("thirdHits")}</th>
                <th className="px-3 py-2 text-left">{t("drawNoCol")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    {t("noDrawsFound")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-line/50 cursor-pointer hover:bg-surface-3/50"
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-3 py-2">{formatDrawDate(row.date)}</td>
                    <td className="px-3 py-2">
                      {OPERATOR_LABELS[row.operator] ?? row.operator}
                    </td>
                    <td className="px-3 py-2 text-center font-number text-gold">
                      {row.first_prize ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-number">
                      {row.second_prize ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-number">
                      {row.third_prize ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-number text-muted">
                      {row.draw_no ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {t("page")} {page} / {totalPages} ({total} {t("drawsCount")})
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-line px-3 py-1 disabled:opacity-40"
            >
              {t("previous")}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-line px-3 py-1 disabled:opacity-40"
            >
              {t("next")}
            </button>
          </div>
        </div>
      </div>

      {selected && (() => {
        const spCount = specialSlotCount(selected.operator);
        const specialLabel =
          spCount === 13 ? t("specialCount13") : t("specialCount10");
        const specialSlots = padPrizeSlots(selected.special_numbers, spCount);
        const consolationSlots = padPrizeSlots(
          selected.consolation_numbers,
          CONSOLATION_SLOT_COUNT
        );
        return (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-line bg-surface-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-center px-4 py-3 border-b border-line">
              <div>
                <h2 className="font-semibold text-foreground">
                  {OPERATOR_LABELS[selected.operator] ?? selected.operator}
                </h2>
                <p className="text-xs text-muted">
                  {formatDrawDate(selected.date)} · {selected.draw_no ?? "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-muted hover:text-foreground text-xl"
              >
                ×
              </button>
            </header>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-surface-3 p-2">
                  <p className="text-[10px] text-muted">{t("firstHits")}</p>
                  <p className="font-number text-lg text-gold">
                    {selected.first_prize ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-3 p-2">
                  <p className="text-[10px] text-muted">{t("secondHits")}</p>
                  <p className="font-number text-lg">{selected.second_prize ?? "—"}</p>
                </div>
                <div className="rounded-lg bg-surface-3 p-2">
                  <p className="text-[10px] text-muted">{t("thirdHits")}</p>
                  <p className="font-number text-lg">{selected.third_prize ?? "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted uppercase mb-2">{specialLabel}</p>
                <div className="grid grid-cols-5 gap-1">
                  {specialSlots.map((n, i) => (
                    <span
                      key={`s-${i}`}
                      className="text-center font-number text-sm py-1 rounded bg-surface-3"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted uppercase mb-2">{t("consolationCount10")}</p>
                <div className="grid grid-cols-5 gap-1">
                  {consolationSlots.map((n, i) => (
                    <span
                      key={`c-${i}`}
                      className="text-center font-number text-sm py-1 rounded bg-surface-3"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
