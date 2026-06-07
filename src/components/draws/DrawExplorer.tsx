"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
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

const OPERATOR_LOGOS: Record<string, string> = {
  magnum: "/logos/magnum.gif",
  damacai: "/logos/damacai.gif",
  toto: "/logos/toto.gif",
  cashsweep: "/logos/cashsweep.gif",
  sarawak: "/logos/cashsweep.gif",
  sabah: "/logos/sabah88.gif",
  sandakan: "/logos/sandakan.gif",
  singapore: "/logos/sgpools.gif",
  sgpools: "/logos/sgpools.gif",
};

const QUICK_FILTERS = [
  { mode: "today" as const, label: "TODAY" },
  { mode: "yesterday" as const, label: "YESTERDAY" },
  { mode: "week" as const, label: "LAST WEEK" },
  { mode: "month" as const, label: "THIS MONTH" },
];

const inputStyle: CSSProperties = {
  backgroundColor: "var(--surface-2)",
  border: "1px solid var(--border-dim)",
  color: "var(--text-primary)",
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

function activeQuickFilter(
  date: string
): "today" | "yesterday" | "week" | "month" | null {
  if (!date) return null;
  const today = todayMYT();
  if (date === today) return "today";
  if (date === addDaysIso(today, -1)) return "yesterday";
  if (date === addDaysIso(today, -7)) return "week";
  if (date === startOfMonthIso(today)) return "month";
  return null;
}

function OperatorLogo({
  operatorKey,
  height = 16,
}: {
  operatorKey: string;
  height?: number;
}) {
  const src = OPERATOR_LOGOS[operatorKey];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={operatorKey}
      className="shrink-0"
      style={{ height, width: "auto", display: "block" }}
    />
  );
}

export function DrawExplorer() {
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
  const quickActive = useMemo(() => activeQuickFilter(date), [date]);

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
    <div
      className="min-h-screen mx-auto w-full max-w-[390px] lg:max-w-3xl"
      style={{ backgroundColor: "#070710" }}
    >
      <div style={{ paddingTop: 72, paddingBottom: 100 }}>
        <div style={{ padding: "0 22px", marginBottom: 20 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#fff",
            }}
          >
            DRAW{" "}
            <span style={{ color: "#00E5FF" }}>RECORDS</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: 8,
              letterSpacing: "0.35em",
              color: "rgba(0,229,255,0.6)",
              marginTop: 2,
            }}
          >
            BY DATE &amp; OPERATOR · FULL HISTORY
          </div>
        </div>

        <div style={{ padding: "0 22px" }}>
        {/* Quick date filters */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map(({ mode, label }) => {
            const selected = quickActive === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => applyQuickFilter(mode)}
                className="font-mono text-[10px] uppercase"
                style={{
                  padding: "6px 10px",
                  border: selected
                    ? "1px solid var(--cyan)"
                    : "1px solid var(--border-dim)",
                  background: selected
                    ? "rgba(0,229,255,0.08)"
                    : "transparent",
                  color: selected ? "var(--cyan)" : "var(--text-dim)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Date + operator filters */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label
            className="font-sans text-[10px] uppercase"
            style={{ letterSpacing: "0.08em", color: "var(--text-dim)" }}
          >
            DATE
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
                setExpandedId(null);
              }}
              className="mt-1 block rounded-none px-3 py-2 font-mono text-sm tabular-nums"
              style={inputStyle}
            />
          </label>
          <label
            className="font-sans text-[10px] uppercase"
            style={{ letterSpacing: "0.08em", color: "var(--text-dim)" }}
          >
            OPERATOR
            <select
              value={operator}
              onChange={(e) => {
                setOperator(e.target.value);
                setPage(1);
                setExpandedId(null);
              }}
              className="mt-1 block min-w-[160px] rounded-none px-3 py-2 font-mono text-sm"
              style={inputStyle}
            >
              <option value="">ALL OPERATORS</option>
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
            className="font-mono text-[10px] uppercase disabled:opacity-40"
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border-dim)",
              color: "var(--text-dim)",
              background: "transparent",
            }}
          >
            DOWNLOAD CSV
          </button>
        </div>

        {loading && (
          <p
            className="mt-4 font-mono text-[10px] uppercase"
            style={{ color: "var(--text-dim)" }}
          >
            LOADING…
          </p>
        )}

        {/* Table */}
        <div className="mt-4 border-t" style={{ borderColor: "var(--border-dim)" }}>
          <table className="w-full border-collapse">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: "var(--border-dim)" }}
              >
                <th className="w-8 py-2" />
                <th
                  className="py-2 text-left font-sans text-[10px] uppercase"
                  style={{
                    letterSpacing: "0.08em",
                    color: "var(--text-dim)",
                  }}
                >
                  DATE
                </th>
                <th
                  className="py-2 text-left font-sans text-[10px] uppercase"
                  style={{
                    letterSpacing: "0.08em",
                    color: "var(--text-dim)",
                  }}
                >
                  OPERATOR
                </th>
                <th
                  className="py-2 text-center font-sans text-[10px] uppercase"
                  style={{
                    letterSpacing: "0.08em",
                    color: "var(--text-dim)",
                  }}
                >
                  1ST
                </th>
                <th
                  className="py-2 text-center font-sans text-[10px] uppercase"
                  style={{
                    letterSpacing: "0.08em",
                    color: "var(--text-dim)",
                  }}
                >
                  2ND
                </th>
                <th
                  className="py-2 text-center font-sans text-[10px] uppercase"
                  style={{
                    letterSpacing: "0.08em",
                    color: "var(--text-dim)",
                  }}
                >
                  3RD
                </th>
                <th
                  className="py-2 text-left font-sans text-[10px] uppercase"
                  style={{
                    letterSpacing: "0.08em",
                    color: "var(--text-dim)",
                  }}
                >
                  DRAW NO
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center font-sans text-[11px]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    No draws found for this date.
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
                        className="cursor-pointer border-b"
                        style={{ borderColor: "var(--border-dim)" }}
                        onClick={() => setExpandedId(open ? null : row.id)}
                      >
                        <td
                          className="py-2 font-mono text-[10px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {open ? "▼" : "▶"}
                        </td>
                        <td
                          className="py-2 font-mono text-xs tabular-nums"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {formatDrawDate(row.date)}
                        </td>
                        <td className="py-2">
                          <span className="flex items-center gap-1.5">
                            <OperatorLogo operatorKey={row.operator} />
                            <span
                              className="font-sans text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {OPERATOR_LABELS[row.operator] ?? row.operator}
                            </span>
                          </span>
                        </td>
                        <td
                          className="py-2 text-center font-mono text-[15px] tabular-nums"
                          style={{ color: "var(--cyan)" }}
                        >
                          {row.first_prize ?? "—"}
                        </td>
                        <td
                          className="py-2 text-center font-mono text-[15px] tabular-nums"
                          style={{ color: "var(--cyan)" }}
                        >
                          {row.second_prize ?? "—"}
                        </td>
                        <td
                          className="py-2 text-center font-mono text-[15px] tabular-nums"
                          style={{ color: "var(--cyan)" }}
                        >
                          {row.third_prize ?? "—"}
                        </td>
                        <td
                          className="py-2 font-mono text-xs tabular-nums"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {row.draw_no ?? "—"}
                        </td>
                      </tr>
                      {open && (
                        <tr
                          className="border-b"
                          style={{
                            borderColor: "var(--border-dim)",
                            backgroundColor: "var(--surface-2)",
                          }}
                        >
                          <td colSpan={7} className="px-3 py-3">
                            <p
                              className="mb-2 font-sans text-[10px] uppercase"
                              style={{
                                letterSpacing: "0.08em",
                                color: "var(--text-dim)",
                              }}
                            >
                              SPECIAL
                            </p>
                            <div className="mb-3 grid grid-cols-5 gap-1 sm:grid-cols-10">
                              {specialSlots.map((n, i) => (
                                <span
                                  key={`s-${i}`}
                                  className="py-1 text-center font-mono text-xs tabular-nums"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {n === "----" ? "—" : n}
                                </span>
                              ))}
                            </div>
                            <p
                              className="mb-2 font-sans text-[10px] uppercase"
                              style={{
                                letterSpacing: "0.08em",
                                color: "var(--text-dim)",
                              }}
                            >
                              CONSOLATION
                            </p>
                            <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
                              {consolationSlots.map((n, i) => (
                                <span
                                  key={`c-${i}`}
                                  className="py-1 text-center font-mono text-xs tabular-nums"
                                  style={{ color: "var(--text-secondary)" }}
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

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: "var(--text-dim)" }}
          >
            PAGE {page} / {totalPages} · {total} DRAWS
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="font-mono text-[10px] uppercase disabled:opacity-40"
              style={{
                padding: "6px 12px",
                border: "1px solid var(--border-dim)",
                color: "var(--text-dim)",
                background: "transparent",
              }}
            >
              PREV
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="font-mono text-[10px] uppercase disabled:opacity-40"
              style={{
                padding: "6px 12px",
                border: "1px solid var(--border-dim)",
                color: "var(--text-dim)",
                background: "transparent",
              }}
            >
              NEXT
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
