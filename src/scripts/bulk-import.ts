import { createServerClient } from "@/lib/supabase/server";
import type { ParsedDraw } from "@/lib/ingest/parse-check4d";
import { buildHistoryEntries } from "@/lib/ingest/stats";
import { calculateHeatScore } from "@/lib/heat-score";
import { padPrizeSlots, specialSlotCount } from "@/lib/prize-slots";
import type { OperatorId, Region } from "@/types";

const DRAW_DAYS_WSS_MYt = [0, 3, 6]; // Sun, Wed, Sat

const BULK_OPERATORS: OperatorId[] = [
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

const CHECK4D_ORG_BASE = "https://www.check4d.org/past-results";

function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function parseYmd(dateIso: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateIso.split("-").map((n) => Number(n));
  return { y, m, d };
}

function isMytDrawDay(dateIso: string): boolean {
  const { y, m, d } = parseYmd(dateIso);
  const myt = new Date(Date.UTC(y, m - 1, d) + 8 * 60 * 60 * 1000);
  return DRAW_DAYS_WSS_MYt.includes(myt.getUTCDay());
}

function addDaysIso(dateIso: string, days: number): string {
  const { y, m, d } = parseYmd(dateIso);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return toIsoDate(dt);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.max(0, Math.round(Math.abs(db - da) / 86_400_000));
}

function normalizePositionTier(position: string): "first" | "second" | "third" | "special" | "consolation" {
  if (position === "first") return "first";
  if (position === "second") return "second";
  if (position === "third") return "third";
  if (position.startsWith("special")) return "special";
  return "consolation";
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/RM\s*/gi, "").replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizePrizeCell(raw: string): string {
  const t = stripTags(raw);
  if (!t || t === "-" || t === "—") return "----";
  if (t === "****" || t === "----" || t === ".") return "----";
  const m = t.match(/\b(\d{4})\b/);
  return m ? m[1] : "----";
}

function splitResultTables(block: string): string[] {
  const tables: string[] = [];
  const re = /<table class="resultTable2"[^>]*>[\s\S]*?<\/table>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    tables.push(m[0]);
  }
  return tables;
}

interface OperatorMatch {
  operator: OperatorId;
  region: Region;
}

function identify4dOperator(headerTable: string): OperatorMatch | null {
  const text = stripTags(headerTable);

  if (/Singapore\s+4D/i.test(text) && text === "Singapore 4D") {
    return { operator: "sgpools", region: "singapore" };
  }
  if (headerTable.includes("logo_magnum.gif") && /Magnum\s+4D/i.test(text) && !/Life|Jackpot Gold/i.test(text)) {
    return { operator: "magnum", region: "west" };
  }
  if (headerTable.includes("logo_damacai.gif") && /Da Ma Cai 1\+3D/i.test(text)) {
    return { operator: "damacai", region: "west" };
  }
  if (headerTable.includes("logo_toto.gif") && /SportsToto\s+4D/i.test(text)) {
    return { operator: "toto", region: "west" };
  }
  if (headerTable.includes("logo_stc4d.gif")) {
    return { operator: "sandakan", region: "east" };
  }
  if (headerTable.includes("logo_cashsweep.gif")) {
    return { operator: "sarawak", region: "east" };
  }
  if (headerTable.includes("logo_sabah88.gif") && /Sabah 88 4D/i.test(text) && !/Lotto/i.test(text)) {
    return { operator: "sabah", region: "east" };
  }
  if (headerTable.includes("logo_gdlotto.jpg")) {
    return { operator: "gd", region: "cambodia" };
  }
  if (headerTable.includes("logo_perdana.jpg")) {
    return { operator: "perdana", region: "cambodia" };
  }
  if (headerTable.includes("logo_harihari.jpg")) {
    return { operator: "hari", region: "cambodia" };
  }
  return null;
}

function extractResultBottomCells(tableHtml: string): string[] {
  return Array.from(
    tableHtml.matchAll(/class="resultbottom"[^>]*>([^<]*)</gi)
  ).map((m) => normalizePrizeCell(m[1]));
}

function parseMainPrizes(prizeTable: string): {
  first_prize: string | null;
  second_prize: string | null;
  third_prize: string | null;
} {
  const tops = Array.from(
    prizeTable.matchAll(/class="resulttop"[^>]*>([^<]*)</gi)
  ).map((m) => normalizePrizeCell(m[1]));

  return {
    first_prize: tops[0] ?? null,
    second_prize: tops[1] ?? null,
    third_prize: tops[2] ?? null,
  };
}

function parseDrawNo(dateTable: string): string | undefined {
  const m = dateTable.match(/Draw No:\s*([^<]+)/i);
  return m?.[1]?.trim() || undefined;
}

function parseZodiac(prizeTable: string): string | undefined {
  const m = prizeTable.match(/zodiac\/([^/."']+)\.(?:png|gif|jpg)/i);
  return m ? m[1].replace(/[-_]/g, " ").toUpperCase() : undefined;
}

function parse4dJackpotTable(tableHtml: string): {
  jackpot1_amount?: number;
  jackpot2_amount?: number;
} {
  if (!/Jackpot/i.test(tableHtml)) return {};

  const amounts = Array.from(
    tableHtml.matchAll(/<b[^>]*>\s*RM\s*([\d,]+\.?\d*)\s*<\/b>/gi)
  )
    .map((m) => parseMoney(m[1]))
    .filter((n): n is number => n != null);

  return {
    jackpot1_amount: amounts[0],
    jackpot2_amount: amounts[1],
  };
}

function parseOperatorBlock(
  block: string,
  dateIso: string,
  match: OperatorMatch
): ParsedDraw | null {
  const tables = splitResultTables(block);
  if (tables.length < 5) return null;

  const headerTable = tables[0];
  let idx = 1;

  if (!identify4dOperator(headerTable)) return null;

  const dateTable = tables[idx++];
  const prizeTable = tables[idx++];
  const specialTable = tables[idx++];
  const consolationTable = tables[idx++];

  const { first_prize, second_prize, third_prize } = parseMainPrizes(prizeTable);
  if (!first_prize || first_prize === "----") return null;

  const spCount = specialSlotCount(match.operator);
  const special_numbers = padPrizeSlots(
    extractResultBottomCells(specialTable),
    spCount
  );
  const consolation_numbers = padPrizeSlots(
    extractResultBottomCells(consolationTable),
    10
  );

  let jackpot1_amount: number | undefined;
  let jackpot2_amount: number | undefined;
  for (; idx < tables.length; idx++) {
    const jp = parse4dJackpotTable(tables[idx]);
    if (jp.jackpot1_amount != null || jp.jackpot2_amount != null) {
      jackpot1_amount = jp.jackpot1_amount;
      jackpot2_amount = jp.jackpot2_amount;
      break;
    }
  }

  const draw: ParsedDraw = {
    date: dateIso,
    operator: match.operator,
    region: match.region,
    draw_no: parseDrawNo(dateTable),
    first_prize,
    second_prize: second_prize ?? undefined,
    third_prize: third_prize ?? undefined,
    special_numbers,
    consolation_numbers,
    jackpot1_amount,
    jackpot2_amount,
    zodiac: match.operator === "toto" ? parseZodiac(prizeTable) : undefined,
    extra_data: undefined,
  };

  return draw;
}

export async function fetchCheck4dOrgHtml(dateIso: string): Promise<string> {
  const url = `${CHECK4D_ORG_BASE}/${dateIso}`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.check4d.org/",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok) return res.text();
    } catch {
      /* retry on timeout / network error */
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  return "";
}

export function parseCheck4dOrg(html: string, dateIso: string): ParsedDraw[] {
  if (!html) return [];

  const blocks = html.split(/<div class="outerbox">/i).slice(1);
  const seen = new Set<OperatorId>();
  const out: ParsedDraw[] = [];

  for (const block of blocks) {
    const tables = splitResultTables(block);
    if (tables.length < 5) continue;

    const match = identify4dOperator(tables[0]);
    if (!match || seen.has(match.operator)) continue;

    const draw = parseOperatorBlock(block, dateIso, match);
    if (!draw?.first_prize || draw.first_prize === "----") continue;

    seen.add(match.operator);
    out.push(draw);
  }

  return out.filter((d) => d.date === dateIso);
}

export function toDbDrawRow(draw: ParsedDraw) {
  return {
    date: draw.date,
    draw_no: draw.draw_no ?? null,
    operator: draw.operator,
    region: draw.region,
    first_prize: draw.first_prize ?? null,
    second_prize: draw.second_prize ?? null,
    third_prize: draw.third_prize ?? null,
    special_numbers: draw.special_numbers,
    consolation_numbers: draw.consolation_numbers,
    jackpot1_amount: draw.jackpot1_amount ?? null,
    jackpot2_amount: draw.jackpot2_amount ?? null,
    zodiac: draw.zodiac ?? null,
    extra_data: draw.extra_data ?? null,
  };
}

/** Insert parsed draws + draw_history rows (skips existing date/operator/region). */
export async function insertParsedDraws(parsed: ParsedDraw[]): Promise<{
  inserted: number;
  operators: string[];
}> {
  const supabase = createServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const operators: string[] = [];
  let inserted = 0;

  for (const draw of parsed) {
    const { data: existing } = await supabase
      .from("draws")
      .select("id")
      .eq("date", draw.date)
      .eq("operator", draw.operator)
      .eq("region", draw.region)
      .maybeSingle();

    if (existing?.id) {
      continue;
    }

    const { data: row, error } = await supabase
      .from("draws")
      .insert(toDbDrawRow(draw))
      .select("id")
      .maybeSingle();

    if (error) throw new Error(`draws insert: ${error.message}`);
    if (!row?.id) throw new Error("No draw id returned");

    const entries = buildHistoryEntries(draw);
    if (entries.length > 0) {
      const rows = entries.map((e) => ({
        number: e.number,
        date: draw.date,
        draw_id: row.id,
        operator: draw.operator,
        position: e.position,
      }));

      const { error: histErr } = await supabase.from("draw_history").insert(rows);
      if (histErr) throw new Error(`draw_history insert: ${histErr.message}`);
    }

    operators.push(draw.operator);
    inserted += 1;
  }

  return { inserted, operators };
}

export async function bulkImportHistorical(params: {
  from: string;
  to: string;
  jobId: string;
  onProgress?: (msg: string) => void;
}) {
  const { from, to, jobId, onProgress } = params;
  const supabase = createServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  let cursor = from;
  let processedDates = 0;
  let insertedDraws = 0;
  let insertedHistoryRows = 0;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  onProgress?.(`[${jobId}] Starting bulk import ${from} → ${to}`);

  while (cursor <= to) {
    if (isMytDrawDay(cursor)) {
      processedDates++;

      onProgress?.(`[${jobId}] Fetching ${cursor} (${processedDates} draw days)`);

      const html = await fetchCheck4dOrgHtml(cursor);
      const parsed = parseCheck4dOrg(html, cursor);

      for (const draw of parsed) {
        const { data: existing } = await supabase
          .from("draws")
          .select("id")
          .eq("date", draw.date)
          .eq("operator", draw.operator)
          .eq("region", draw.region)
          .maybeSingle();

        if (existing?.id) {
          continue;
        }

        const { data: inserted, error } = await supabase
          .from("draws")
          .insert(toDbDrawRow(draw))
          .select("id")
          .maybeSingle();

        if (error) throw new Error(`draws insert: ${error.message}`);
        if (!inserted?.id) throw new Error("No draw id returned");

        const entries = buildHistoryEntries(draw);
        if (entries.length > 0) {
          const rows = entries.map((e) => ({
            number: e.number,
            date: draw.date,
            draw_id: inserted.id,
            operator: draw.operator,
            position: e.position,
          }));

          const { error: histErr } = await supabase
            .from("draw_history")
            .insert(rows);
          if (histErr) throw new Error(`draw_history insert: ${histErr.message}`);

          insertedHistoryRows += rows.length;
        }

        insertedDraws += 1;
      }

      await sleep(1000);
    }

    cursor = addDaysIso(cursor, 1);
  }

  onProgress?.(
    `[${jobId}] Scrape complete. insertedDraws=${insertedDraws}, insertedHistoryRows=${insertedHistoryRows}. Recomputing number_stats...`
  );

  const since = "2010-01-01";

  const { data: historyRows } = await supabase
    .from("draw_history")
    .select("number,date,operator,position")
    .in("operator", BULK_OPERATORS)
    .gte("date", since)
    .lte("date", to)
    .order("date", { ascending: false });

  const byNumber = new Map<
    string,
    {
      dates: string[];
      total: number;
      counts: Record<string, number>;
      last?: { date: string; operator: string; position: string };
    }
  >();

  for (const r of historyRows ?? []) {
    const row = r as {
      number: unknown;
      date: unknown;
      operator: unknown;
      position: unknown;
    };
    const number = String(row.number);
    const date = String(row.date);
    const operator = String(row.operator);
    const position = String(row.position);

    if (!byNumber.has(number)) {
      byNumber.set(number, {
        dates: [],
        total: 0,
        counts: { first: 0, second: 0, third: 0, special: 0, consolation: 0 },
        last: { date, operator, position },
      });
    }

    const entry = byNumber.get(number)!;
    entry.total += 1;
    entry.dates.push(date);

    const tier = normalizePositionTier(position);
    entry.counts[tier] = (entry.counts[tier] ?? 0) + 1;
  }

  const today = new Date().toISOString().split("T")[0];

  const statsRows = Array.from(byNumber.entries()).map(([number, agg]) => {
    const dates = [...agg.dates].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    const totalHits = agg.total;

    const lastSeenDate = dates[0] ?? null;
    const firstDate = dates[dates.length - 1] ?? null;
    const currentGap = lastSeenDate ? daysBetween(lastSeenDate, today) : null;

    let avgGap: number | null = null;
    let maxGap: number | null = null;
    if (dates.length >= 2) {
      const gaps: number[] = [];
      for (let i = 0; i < dates.length - 1; i++) {
        gaps.push(daysBetween(dates[i], dates[i + 1]));
      }
      avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      maxGap = Math.max(...gaps);
    }

    const daysSinceFirst = firstDate ? daysBetween(firstDate, today) || 1 : 1;
    const heatScore = calculateHeatScore(
      totalHits,
      daysSinceFirst,
      currentGap ?? 0
    );

    return {
      number,
      total_hits: totalHits,
      first_prize_hits: agg.counts.first ?? 0,
      second_prize_hits: agg.counts.second ?? 0,
      third_prize_hits: agg.counts.third ?? 0,
      special_hits: agg.counts.special ?? 0,
      consolation_hits: agg.counts.consolation ?? 0,
      last_seen_date: lastSeenDate,
      last_seen_operator: agg.last?.operator ?? null,
      last_seen_position: agg.last?.position ?? null,
      avg_gap_days: avgGap != null ? Math.round(avgGap * 10) / 10 : null,
      max_gap_days: maxGap != null ? Math.round(maxGap) : null,
      current_gap_days: currentGap,
      heat_score: Math.round(heatScore * 1000) / 1000,
      updated_at: new Date().toISOString(),
    };
  });

  const BATCH = 500;
  for (let i = 0; i < statsRows.length; i += BATCH) {
    const batch = statsRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("number_stats")
      .upsert(batch, { onConflict: "number" });
    if (error) throw new Error(`number_stats upsert: ${error.message}`);
  }

  onProgress?.(`[${jobId}] Done.`);

  return {
    success: true,
    jobId,
    insertedDraws,
    insertedHistoryRows,
    updatedNumberStats: statsRows.length,
  };
}
