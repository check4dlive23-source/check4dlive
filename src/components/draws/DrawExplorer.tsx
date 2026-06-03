"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { SubpageHeader } from "@/components/layout/SubpageHeader";
import { useLang } from "@/lib/language-context";
import { todayMYT } from "@/lib/draw-time";
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

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
}

function startOfMonthIso(iso: string): string {
  const [y, m] = iso.split("-");
  return `${y}-${m}-01`;
}

export function DrawExplorer() {
  const { t } = useLang();
  const [date, setDate] = useState("");
  const [operator, setOperator] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DrawListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDate(todayMYT());
  }, []);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    params.set("date", date);
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

  const applyQuickFilter = (mode: "today" | "yesterday" | "week" | "month") => {
    const today = todayMYT();
    if (mode === "today") setDate(today);
    else if (mode === "yesterday") setDate(addDaysIso(today, -1));
    else if (mode === "week") setDate(addDaysIso(today, -7));
    else setDate(startOfMonthIso(today));
    setPage(1);
    setExpandedId(null);
  };

  const downloadCsv = () => {
    const header = [
      "date",
      "operator",
      "first",
      "second",
      "third",
      "draw_no",
    ];
    const lines = items.map((row) =>
      [
        row.date,
        row.operator,
        row.first_prize ?? "",
        row.second_prize ?? "",
        row.third_prize ?? "",
        row.draw_no ?? "",
      ].join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `draws-${date || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-surface pb-16 sm:pb-0">
      <SubpageHeader title={t("drawExplorer")} subtitle={t("drawsSubtitle")} />

      <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["today", "filterToday"],
              ["yesterday", "filterYesterday"],
              ["week", "filterLastWeek"],
              ["month", "filterThisMonth"],
            ] as const
          ).map(([mode, key]) => (
            <button
              key={mode}
              type="button"
              onClick={() => applyQuickFilter(mode)}
              className="rounded-full border border-line bg-surface-3 px-3 py-1 text-xs text-muted hover:border-gold/50 hover:text-gold"
            >
              {t(key)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs text-muted">
            {t("dateLabel")}
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
                setExpandedId(null);
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
                setExpandedId(null);
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
            onClick={downloadCsv}
            disabled={items.length === 0}
            className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold hover:bg-gold/20 disabled:opacity-40"
          >
            {t("downloadCsv")}
          </button>
        </div>

        {loading && <p className="text-sm text-muted">{t("loading")}</p>}

        <div className="rounded-xl border border-line bg-surface-2 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted uppercase border-b border-line bg-surface-3">
                <th className="px-3 py-2 text-left w-8" />
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
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    {t("noDrawsFound")}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const open = expandedId === row.id;
                  const spCount = specialSlotCount(row.operator);
                  const specialSlots = padPrizeSlots(
                    row.special_numbers,
                    spCount
                  );
                  const consolationSlots = padPrizeSlots(
                    row.consolation_numbers,
                    CONSOLATION_SLOT_COUNT
                  );
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className="border-b border-line/50 cursor-pointer hover:bg-surface-3/50"
                        onClick={() =>
                          setExpandedId(open ? null : row.id)
                        }
                      >
                        <td className="px-3 py-2 text-muted text-xs">
                          {open ? "▼" : "▶"}
                        </td>
                        <td className="px-3 py-2">
                          {formatDrawDate(row.date)}
                        </td>
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
                      {open && (
                        <tr
                          key={`${row.id}-detail`}
                          className="border-b border-line bg-surface-3/30"
                        >
                          <td colSpan={7} className="px-4 py-3">
                            <p className="text-[10px] text-muted uppercase mb-2">
                              {t("specialSection")}
                            </p>
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 mb-3">
                              {specialSlots.map((n, i) => (
                                <span
                                  key={`s-${i}`}
                                  className="text-center font-number text-sm py-1 rounded bg-surface-2 border border-line"
                                >
                                  {n === "----" ? "—" : n}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-muted uppercase mb-2">
                              {t("consolationSection")}
                            </p>
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                              {consolationSlots.map((n, i) => (
                                <span
                                  key={`c-${i}`}
                                  className="text-center font-number text-sm py-1 rounded bg-surface-2 border border-line"
                                >
                                  {n === "----" ? "—" : n}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
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
    </div>
  );
}
