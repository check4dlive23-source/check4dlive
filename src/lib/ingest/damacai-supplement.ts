import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrawResultV2Row } from "@/lib/draw-results-v2";
import { mergeExtraDataForUpsert } from "@/lib/extra-data-merge";
import { todayMYT } from "@/lib/draw-time";
import {
  fetchDamacaiDrawForDate,
  fetchDamacaiTodayDraw,
} from "@/lib/ingest/damacai-api";
import type { DrawRow } from "@/lib/live-results";

function strField(v: unknown): string {
  return String(v ?? "").trim();
}

function isReal333Field(v: unknown): boolean {
  const s = strField(v);
  return s !== "" && s !== "----";
}

export function hasValidDamacai3Plus3DBlock(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const d = raw as Record<string, unknown>;
  return (
    isReal333Field(d.first) ||
    isReal333Field(d.second) ||
    isReal333Field(d.third)
  );
}

export function damacaiNeedsOfficialSupplement(row: DrawRow): boolean {
  const extra = row.extra_data as Record<string, unknown> | undefined;
  if (!extra) return true;
  return !hasValidDamacai3Plus3DBlock(extra.damacai3Plus3D);
}

export function mergeDamacaiOfficialSupplement(
  row: DrawRow,
  official: DrawResultV2Row
): DrawRow {
  const offExtra = (official.extra_data ?? {}) as Record<string, unknown>;
  const offBlock = offExtra.damacai3Plus3D;
  if (!hasValidDamacai3Plus3DBlock(offBlock)) {
    return row;
  }

  const out: DrawRow = { ...row };
  const existingExtra = {
    ...((out.extra_data as Record<string, unknown> | undefined) ?? {}),
  };
  const mergedExtra = mergeExtraDataForUpsert(
    { ...existingExtra, damacai3Plus3D: offBlock },
    existingExtra
  );
  if (mergedExtra !== undefined) {
    out.extra_data = mergedExtra;
  }
  return out;
}

function isoToDamacaiYmd(dateIso: string): string {
  return dateIso.replace(/-/g, "");
}

/** Fill Damacai 3+3D from damacai.com.my when check4d gaps exist. */
export async function supplementDamacaiFromOfficial(
  operators: Record<string, DrawRow>
): Promise<Record<string, DrawRow>> {
  const damacai = operators.damacai;
  if (!damacai || !damacaiNeedsOfficialSupplement(damacai)) {
    return operators;
  }

  const rowDate = (damacai.date as string | undefined) ?? todayMYT();
  let official: DrawResultV2Row | null = null;

  try {
    official = await fetchDamacaiDrawForDate(isoToDamacaiYmd(rowDate));
    if (!official) {
      const todayDraw = await fetchDamacaiTodayDraw();
      if (todayDraw && todayDraw.draw_date === rowDate) {
        official = todayDraw;
      }
    }
  } catch (e) {
    console.warn(
      "[damacai-supplement] official API failed:",
      e instanceof Error ? e.message : e
    );
    return operators;
  }

  if (!official) {
    console.warn(
      `[damacai-supplement] no official draw for ${rowDate} (non-draw day or API empty)`
    );
    return operators;
  }

  if (!hasValidDamacai3Plus3DBlock(official.extra_data?.damacai3Plus3D)) {
    return operators;
  }

  return {
    ...operators,
    damacai: mergeDamacaiOfficialSupplement(damacai, official),
  };
}

/** After syncOfficialSourcesV2: merge v2 official 3+3D into a draws row (caller upserts). */
export async function patchDamacaiDrawFromV2(
  supabase: SupabaseClient,
  drawDate: string
): Promise<DrawRow | null> {
  const { data: v2Row, error: v2Err } = await supabase
    .from("draw_results_v2")
    .select(
      "draw_date,draw_no,operator,first_prize,second_prize,third_prize,special_numbers,consolation_numbers,extra_data,source"
    )
    .eq("operator", "damacai")
    .eq("draw_date", drawDate)
    .maybeSingle();

  if (v2Err) {
    console.warn(
      `[damacai-supplement] v2 read failed for ${drawDate}:`,
      v2Err.message
    );
    return null;
  }

  if (!v2Row || !hasValidDamacai3Plus3DBlock(v2Row.extra_data?.damacai3Plus3D)) {
    return null;
  }

  const { data: drawsRow, error: drawsErr } = await supabase
    .from("draws")
    .select("*")
    .eq("operator", "damacai")
    .eq("date", drawDate)
    .maybeSingle();

  if (drawsErr) {
    console.warn(
      `[damacai-supplement] draws read failed for ${drawDate}:`,
      drawsErr.message
    );
    return null;
  }

  if (!drawsRow) {
    return null;
  }

  const merged = mergeDamacaiOfficialSupplement(
    drawsRow as DrawRow,
    v2Row as DrawResultV2Row
  );

  if (!damacaiNeedsOfficialSupplement(merged)) {
    return merged;
  }

  return null;
}
