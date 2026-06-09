"use client";

import Link from "next/link";
import {
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
import { useLang } from "@/lib/language-context";
import { PageLayout } from "@/components/layout/PageLayout";
import type { DrawListItem } from "@/types/analytics";

const OPERATOR_LOGOS: Record<string, string> = {
  magnum: "/logos/magnum.gif",
  damacai: "/logos/damacai.gif",
  toto: "/logos/toto.gif",
  cashsweep: "/logos/cashsweep.gif",
  sarawak: "/logos/cashsweep.gif",
  sabah: "/logos/sabah88.gif",
  sandakan: "/logos/sandakan.gif",
  sgpools: "/logos/sgpools.gif",
  singapore: "/logos/sgpools.gif",
};

const inputStyle: CSSProperties = {
  background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)",
  border: "1px solid rgba(0,229,255,0.15)",
  borderRadius: 10,
  color: "white",
  outline: "none",
  width: "100%",
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
  const { t } = useLang();
  const [date, setDate] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
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
    if (dateTo && dateTo !== date) params.set("dateTo", dateTo);
    if (selectedOperators.length > 0) params.set("operator", selectedOperators.join(","));
    const res = await fetch(`/api/history?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [date, dateTo, selectedOperators, page]);

  useEffect(() => {
    load();
  }, [load]);

  const applyQuickFilter = (mode: "today" | "yesterday" | "week" | "month") => {
    const today = todayMYT();
    if (mode === "today") {
      setDate(today);
      setDateTo(today);
    } else if (mode === "yesterday") {
      const y = addDaysIso(today, -1);
      setDate(y);
      setDateTo(y);
    } else if (mode === "week") {
      setDate(addDaysIso(today, -7));
      setDateTo(today);
    } else {
      setDate(startOfMonthIso(today));
      setDateTo(today);
    }
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

  const QUICK_FILTERS = [
    { mode: "today" as const, label: t("filterToday") },
    { mode: "yesterday" as const, label: t("filterYesterday") },
    { mode: "week" as const, label: t("filterLastWeek") },
    { mode: "month" as const, label: t("filterThisMonth") },
  ];

  return (
    <PageLayout
      title="DRAW "
      titleAccent="RECORDS"
      subtitle={t("drawRecordsSubtitle")}
    >
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
                  borderRadius: 8,
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
        <div className="mt-4 space-y-4">
          <label
            className="font-sans text-[10px] uppercase"
            style={{ letterSpacing: "0.08em", color: "var(--text-dim)" }}
          >
            {t("dateLabel")}
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
          <div>
            <p className="font-sans text-[10px] uppercase mb-2" style={{ letterSpacing: "0.08em", color: "var(--text-dim)" }}>{t("operatorLabel")}</p>
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedOperators([])}
                className="rounded font-sans text-[10px] uppercase"
                style={{ padding: "6px 10px", border: selectedOperators.length === 0 ? "1px solid var(--cyan)" : "1px solid rgba(0,229,255,0.15)", background: selectedOperators.length === 0 ? "rgba(0,229,255,0.08)" : "transparent", color: selectedOperators.length === 0 ? "var(--cyan)" : "var(--text-dim)", borderRadius: 8 }}
              >
                {t("allOperators")}
              </button>
              {OPERATORS.map((op) => {
                const active = selectedOperators.includes(op);
                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => {
                      setSelectedOperators(prev =>
                        prev.includes(op) ? prev.filter(o => o !== op) : [...prev, op]
                      );
                      setPage(1);
                      setExpandedId(null);
                    }}
                    className="shrink-0 rounded"
                    style={{ padding: "6px 10px", border: active ? "1px solid var(--cyan)" : "1px solid rgba(0,229,255,0.15)", background: active ? "rgba(0,229,255,0.08)" : "transparent", borderRadius: 8 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={OPERATOR_LOGOS[op] ?? ""} alt={op} style={{ height: 20, width: "auto", display: "block" }} />
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={items.length === 0}
            className="font-mono text-[10px] uppercase disabled:opacity-40"
            style={{
              padding: "8px 16px",
              border: "1px solid rgba(0,229,255,0.15)",
              borderRadius: 10,
              color: "rgba(0,229,255,0.6)",
              background: "rgba(0,229,255,0.05)",
              cursor: items.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {t("downloadCsv")}
          </button>
        </div>

        {loading && (
          <p
            className="mt-4 font-mono text-[10px] uppercase"
            style={{ color: "var(--text-dim)" }}
          >
            {t("loading")}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {!loading && items.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              {t("noDrawsForDate")}
            </div>
          ) : (
            items.map((row) => {
              const open = expandedId === row.id;
              const spCount = specialSlotCount(row.operator);
              const specialSlots = padPrizeSlots(row.special_numbers, spCount);
              const consolationSlots = padPrizeSlots(row.consolation_numbers, CONSOLATION_SLOT_COUNT);
              return (
                <div key={row.id} style={{ background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)", border: `1px solid ${open ? "rgba(0,229,255,0.3)" : "rgba(0,229,255,0.08)"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
                  {/* 主行 */}
                  <div className="flex items-center gap-2 cursor-pointer" style={{ padding: "12px 16px" }} onClick={() => setExpandedId(open ? null : row.id)}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", width: 12, flexShrink: 0 }}>{open ? "▼" : "▶"}</span>
                    <span className="font-mono tabular-nums" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0, width: 68 }}>
                      {formatDrawDate(row.date)}
                    </span>
                    <span style={{ flexShrink: 0, width: 28, display: "flex", alignItems: "center" }}>
                      <OperatorLogo operatorKey={row.operator} />
                    </span>
                    <div className="flex items-center flex-1 justify-end gap-2">
                      <span className="font-mono tabular-nums" style={{ fontSize: 17, fontWeight: 800, color: "#FFD700", width: 44, textAlign: "right" }}>{row.first_prize ?? "—"}</span>
                      <span className="font-mono tabular-nums" style={{ fontSize: 14, color: "rgba(192,192,192,0.8)", width: 44, textAlign: "right" }}>{row.second_prize ?? "—"}</span>
                      <span className="font-mono tabular-nums" style={{ fontSize: 14, color: "rgba(205,127,50,0.8)", width: 44, textAlign: "right" }}>{row.third_prize ?? "—"}</span>
                    </div>
                  </div>
                  {/* 展开详情 */}
                  {open && (
                    <div style={{ borderTop: "1px solid rgba(0,229,255,0.08)", padding: "12px 16px", background: "rgba(0,0,0,0.2)" }}>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{t("specialSection")}</p>
                      <div className="grid grid-cols-5 gap-1 sm:grid-cols-10 mb-4">
                        {specialSlots.map((n, i) => (
                          <span key={`s-${i}`} className="py-1 text-center font-mono text-xs tabular-nums" style={{ color: n === "----" ? "rgba(255,255,255,0.15)" : "var(--cyan)" }}>
                            {n === "----" ? "—" : n}
                          </span>
                        ))}
                      </div>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{t("consolationSection")}</p>
                      <div className="grid grid-cols-5 gap-1 sm:grid-cols-10 mb-4">
                        {consolationSlots.map((n, i) => (
                          <span key={`c-${i}`} className="py-1 text-center font-mono text-xs tabular-nums" style={{ color: n === "----" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)" }}>
                            {n === "----" ? "—" : n}
                          </span>
                        ))}
                      </div>
                      <Link href={`/draw/${row.date}-${row.operator}`} style={{ fontSize: 11, color: "#00E5FF", letterSpacing: "0.08em", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {t("viewDetails")} →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: "var(--text-dim)" }}
          >
            {t("pageOf")} {page} / {totalPages} · {total} {t("drawsCount")}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="font-mono text-[10px] uppercase disabled:opacity-40"
              style={{
                padding: "8px 16px",
                border: "1px solid rgba(0,229,255,0.15)",
                borderRadius: 8,
                color: "rgba(0,229,255,0.6)",
                background: "rgba(0,229,255,0.05)",
                fontSize: 12,
              }}
            >
              {t("previous")}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="font-mono text-[10px] uppercase disabled:opacity-40"
              style={{
                padding: "8px 16px",
                border: "1px solid rgba(0,229,255,0.15)",
                borderRadius: 8,
                color: "rgba(0,229,255,0.6)",
                background: "rgba(0,229,255,0.05)",
                fontSize: 12,
              }}
            >
              {t("next")}
            </button>
          </div>
        </div>
    </PageLayout>
  );
}
