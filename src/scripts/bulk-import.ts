import { createServerClient } from "@/lib/supabase/server";
import type { ParsedDraw } from "@/lib/ingest/parse-check4d";
import { buildHistoryEntries } from "@/lib/ingest/stats";
import { calculateHeatScore } from "@/lib/heat-score";
import type { OperatorId } from "@/types";

const DRAW_DAYS_WSS_MYt = [0, 3, 6]; // Sun, Wed, Sat

function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function parseYmd(dateIso: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateIso.split("-").map((n) => Number(n));
  return { y, m, d };
}

function isMytDrawDay(dateIso: string): boolean {
  const { y, m, d } = parseYmd(dateIso);
  // Convert YYYY-MM-DD into MYT (UTC+8) weekday
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

// Note: heat_level is computed dynamically in the UI from avg_gap/current_gap.

function toDbDrawRow(draw: ParsedDraw) {
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

function operatorSet(): OperatorId[] {
  return ["magnum", "damacai", "toto"];
}

async function fetch4dMoonPastResultsHtml(dateIso: string): Promise<string> {
  const res = await fetch(`https://www.4dmoon.com/past-results/${dateIso}`, {
    // Some hosts block requests without a UA. Keep it simple and stable.
    headers: {
      "user-agent": "check4dlive-bulk-import/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`4dmoon fetch failed (${res.status}) for ${dateIso}`);
  }

  return res.text();
}

function parse4dMoonOperatorBlock(params: {
  html: string;
  dateIso: string;
  operator: OperatorId;
  logoSrc: string;
  titleIncludes: string;
}): ParsedDraw | null {
  const { html, dateIso, operator, logoSrc, titleIncludes } = params;

  const logoIdx = html.indexOf(logoSrc);
  if (logoIdx < 0) return null;

  // Grab a reasonably-sized window around the operator card.
  const start = Math.max(0, logoIdx - 20_000);
  const end = Math.min(html.length, logoIdx + 80_000);
  const block = html.slice(start, end);

  if (!block.toLowerCase().includes(titleIncludes.toLowerCase())) return null;

  const prizeMatches = Array.from(block.matchAll(/class="rtn">(\d{4})</g)).map(
    (m) => m[1]
  );
  if (prizeMatches.length < 3) return null;

  const specialStart = block.indexOf('class="rpl">Special</td>');
  const consolationStart = block.indexOf('class="rpl">Consolation</td>');

  const specialsPart =
    specialStart >= 0 && consolationStart > specialStart
      ? block.slice(specialStart, consolationStart)
      : "";
  const consolationPart =
    consolationStart >= 0 ? block.slice(consolationStart) : "";

  const special_numbers = Array.from(
    specialsPart.matchAll(/class="rbn">(\d{4})</g)
  )
    .map((m) => m[1])
    .slice(0, 10);
  const consolation_numbers = Array.from(
    consolationPart.matchAll(/class="rbn">(\d{4})</g)
  )
    .map((m) => m[1])
    .slice(0, 10);

  const rdd = /class="rdd">\([^)]*\)\s*[^<]*#([^<]+)<\/span>/i.exec(block)?.[1];
  const draw_no = rdd ? rdd.trim() : undefined;

  return {
    date: dateIso,
    operator,
    region: "west",
    draw_no,
    first_prize: prizeMatches[0] ?? null,
    second_prize: prizeMatches[1] ?? null,
    third_prize: prizeMatches[2] ?? null,
    special_numbers,
    consolation_numbers,
    jackpot1_amount: undefined,
    jackpot2_amount: undefined,
    zodiac: undefined,
    extra_data: undefined,
  };
}

function parse4dMoonPastResults(params: {
  html: string;
  dateIso: string;
  operators: OperatorId[];
}): ParsedDraw[] {
  const { html, dateIso, operators } = params;

  const out: ParsedDraw[] = [];

  if (operators.includes("damacai")) {
    const d = parse4dMoonOperatorBlock({
      html,
      dateIso,
      operator: "damacai",
      logoSrc: "/images/logo_damacai.gif",
      titleIncludes: "Damacai",
    });
    if (d) out.push(d);
  }

  if (operators.includes("magnum")) {
    const m = parse4dMoonOperatorBlock({
      html,
      dateIso,
      operator: "magnum",
      logoSrc: "/images/logo_magnum.gif",
      titleIncludes: "Magnum",
    });
    if (m) out.push(m);
  }

  if (operators.includes("toto")) {
    const t = parse4dMoonOperatorBlock({
      html,
      dateIso,
      operator: "toto",
      logoSrc: "/images/logo_sportstoto.gif",
      titleIncludes: "Toto",
    });
    if (t) out.push(t);
  }

  return out.filter((d) => d.date === dateIso);
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

  const ops = operatorSet();

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

      // check4dresult.com "past-results?date=" is unreliable (404/redirect).
      // 4dmoon provides stable HTML pages per draw date.
      const html = await fetch4dMoonPastResultsHtml(cursor);
      const parsed = parse4dMoonPastResults({ html, dateIso: cursor, operators: ops });

      for (const draw of parsed) {
        const { data: existing } = await supabase
          .from("draws")
          .select("id")
          .eq("date", draw.date)
          .eq("operator", draw.operator)
          .eq("region", draw.region)
          .maybeSingle();

        if (existing?.id) {
          continue; // skip if already exists
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

      await sleep(1000); // 1 request/sec to avoid being blocked
    }

    cursor = addDaysIso(cursor, 1);
  }

  onProgress?.(
    `[${jobId}] Scrape complete. insertedDraws=${insertedDraws}, insertedHistoryRows=${insertedHistoryRows}. Recomputing number_stats...`
  );

  // Recompute number_stats for affected numbers (based on draw_history rows since 2010)
  const since = "2010-01-01";

  // Fetch draw_history rows for the operators and date range.
  // We keep it simple here: pull all matching rows and aggregate in memory.
  const { data: historyRows } = await supabase
    .from("draw_history")
    .select("number,date,operator,position")
    .in("operator", ops)
    .gte("date", since)
    .lte("date", to)
    .order("date", { ascending: false });

  const byNumber = new Map<
    string,
    { dates: string[]; total: number; counts: Record<string, number>; last?: { date: string; operator: string; position: string }; }
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
    const dates = [...agg.dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
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
    const heatScore = calculateHeatScore(totalHits, daysSinceFirst, currentGap ?? 0);

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

  // Upsert in batches to avoid request size issues
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

