import { createClient } from "@/lib/supabase/server";
import type { DrawListItem, SearchResultRow } from "@/types/analytics";
import type { HeatLevel } from "@/types/number-intelligence";
import { calculateHeatScore } from "@/lib/heat-score";

const OPERATORS = [
  "magnum",
  "damacai",
  "toto",
  "sabah",
  "sarawak",
  "sandakan",
  "gd",
  "perdana",
  "hari",
  "sgpools",
];

export function wildcardToLike(pattern: string): string {
  const cleaned = pattern.replace(/[^0-9*?]/g, "").slice(0, 4);
  const padded = cleaned.padEnd(4, "*");
  return padded
    .split("")
    .map((ch) => (ch === "?" || ch === "*" ? "_" : ch))
    .join("");
}

function heatLevel(total: number, gap: number): HeatLevel {
  if (total === 0) return "cold";
  if (gap > 60) return "cold";
  if (gap <= 14 && total >= 2) return "hot";
  return "normal";
}

export async function getDrawHistory(params: {
  date?: string;
  dateTo?: string;
  operator?: string;
  page: number;
  pageSize?: number;
}): Promise<{
  items: DrawListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const pageSize = params.pageSize ?? 20;
  const page = Math.max(1, params.page);

  const supabase = createClient();
  if (!supabase) {
    return { items: [], total: 0, page, pageSize };
  }

  let query = supabase
    .from("draw_results_v2")
    .select(
      "id, draw_date, draw_no, operator, first_prize, second_prize, third_prize, special_numbers, consolation_numbers",
      { count: "exact" }
    )
    .order("draw_date", { ascending: false })
    .order("operator", { ascending: true });

  if (params.date && params.dateTo && params.dateTo !== params.date) {
    query = query.gte("draw_date", params.date).lte("draw_date", params.dateTo);
  } else if (params.date) {
    query = query.eq("draw_date", params.date);
  }
  if (params.operator) {
    const ops = params.operator.split(",").map((s) => s.trim()).filter(Boolean);
    if (ops.length === 1) {
      query = query.eq("operator", ops[0]);
    } else if (ops.length > 1) {
      query = query.in("operator", ops);
    }
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);

  if (error) {
    return { items: [], total: 0, page, pageSize };
  }

  const items: DrawListItem[] = (data ?? []).map((d) => ({
    id: d.id as string,
    date: d.draw_date as string,
    operator: d.operator as string,
    draw_no: (d.draw_no as string) ?? null,
    first_prize: (d.first_prize as string) ?? null,
    second_prize: (d.second_prize as string) ?? null,
    third_prize: (d.third_prize as string) ?? null,
    special_numbers: (d.special_numbers as string[]) ?? null,
    consolation_numbers: (d.consolation_numbers as string[]) ?? null,
  }));

  return { items, total: count ?? 0, page, pageSize };
}

export async function searchNumbers(
  query: string
): Promise<SearchResultRow[]> {
  const like = wildcardToLike(query);
  if (!like.includes("_") && like.length < 4) {
    return [];
  }

  const supabase = createClient();
  if (!supabase) {
    return mockSearchResults(query);
  }

  const { data: history, error } = await supabase
    .from("draw_history")
    .select("number, date, operator")
    .like("number", like)
    .limit(2000);

  if (error || !history?.length) {
    return mockSearchResults(query);
  }

  const map = new Map<
    string,
    { total: number; last: string; ops: Record<string, number> }
  >();

  for (const row of history) {
    const n = row.number as string;
    const cur = map.get(n) ?? { total: 0, last: "", ops: {} };
    cur.total += 1;
    const op = row.operator as string;
    cur.ops[op] = (cur.ops[op] ?? 0) + 1;
    if (!cur.last || (row.date as string) > cur.last) {
      cur.last = row.date as string;
    }
    map.set(n, cur);
  }

  const today = new Date().toISOString().split("T")[0];

  return Array.from(map.entries())
    .map(([number, v]) => {
      const gap = v.last
        ? Math.max(
            0,
            Math.round(
              (new Date(today).getTime() - new Date(v.last).getTime()) /
                86_400_000
            )
          )
        : 999;
      const heat = calculateHeatScore(v.total, 90, gap);
      return {
        number,
        total_hits: v.total,
        last_seen: v.last || null,
        heat_score: Math.round(heat * 1000) / 1000,
        heat_level: heatLevel(v.total, gap),
        operators: v.ops,
      };
    })
    .sort((a, b) => b.total_hits - a.total_hits);
}

function mockSearchResults(query: string): SearchResultRow[] {
  const samples = ["1234", "1288", "1200", "1299", "8888"];
  const like = wildcardToLike(query);
  const re = new RegExp(
    "^" + like.replace(/_/g, "[0-9]") + "$"
  );
  return samples
    .filter((n) => re.test(n))
    .map((number) => ({
      number,
      total_hits: 2,
      last_seen: "2026-05-31",
      heat_score: 0.05,
      heat_level: "normal" as HeatLevel,
      operators: { magnum: 1, toto: 1 },
    }));
}

export { OPERATORS };
