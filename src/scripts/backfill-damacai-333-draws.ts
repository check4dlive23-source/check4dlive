/**
 * One-off backfill: merge Damacai 3+3D from draw_results_v2 into draws.
 * Run: npm run backfill:damacai-333 -- --from=2026-06-01 --to=2026-06-14 --dry-run
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import type { DrawResultV2Row } from "@/lib/draw-results-v2";
import {
  damacaiNeedsOfficialSupplement,
  hasValidDamacai3Plus3DBlock,
  mergeDamacaiOfficialSupplement,
} from "@/lib/ingest/damacai-supplement";
import { upsertDrawResults, type DrawRow } from "@/lib/live-results";

loadEnvLocal();

const PAGE = 200;

interface BackfillArgs {
  from: string;
  to: string;
  dryRun: boolean;
}

function parseBackfillArgs(): BackfillArgs {
  const today = new Date().toISOString().slice(0, 10);
  let from = "2026-06-01";
  let to = today;
  let dryRun = false;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--from=")) from = arg.slice(7);
    else if (arg.startsWith("--to=")) to = arg.slice(5);
    else if (arg === "--dry-run") dryRun = true;
  }

  return { from, to, dryRun };
}

function summarize333(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "(missing)";
  const d = raw as Record<string, unknown>;
  return `first=${String(d.first ?? "")} second=${String(d.second ?? "")} third=${String(d.third ?? "")}`;
}

async function main() {
  const { from, to, dryRun } = parseBackfillArgs();
  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured (.env.local)");
    process.exit(1);
  }

  console.log(
    `[backfill-damacai-333] ${from} → ${to} dryRun=${dryRun}`
  );

  let offset = 0;
  let scanned = 0;
  let patched = 0;
  let skipped = 0;
  const errors: string[] = [];

  while (true) {
    const { data: v2Rows, error } = await supabase
      .from("draw_results_v2")
      .select(
        "draw_date,draw_no,operator,first_prize,second_prize,third_prize,special_numbers,consolation_numbers,extra_data,source"
      )
      .eq("operator", "damacai")
      .gte("draw_date", from)
      .lte("draw_date", to)
      .order("draw_date", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error(error.message);
      process.exit(1);
    }

    if (!v2Rows?.length) break;

    for (const v2Row of v2Rows) {
      scanned += 1;
      const drawDate = v2Row.draw_date as string;

      if (!hasValidDamacai3Plus3DBlock(v2Row.extra_data?.damacai3Plus3D)) {
        skipped += 1;
        continue;
      }

      const { data: drawsRow, error: drawsErr } = await supabase
        .from("draws")
        .select("*")
        .eq("operator", "damacai")
        .eq("date", drawDate)
        .maybeSingle();

      if (drawsErr) {
        errors.push(`${drawDate}: draws read ${drawsErr.message}`);
        continue;
      }

      if (!drawsRow) {
        console.log(`[skip] ${drawDate} — no draws row`);
        skipped += 1;
        continue;
      }

      const before = (drawsRow.extra_data as Record<string, unknown> | undefined)
        ?.damacai3Plus3D;
      const merged = mergeDamacaiOfficialSupplement(
        drawsRow as DrawRow,
        v2Row as DrawResultV2Row
      );
      const after = (merged.extra_data as Record<string, unknown> | undefined)
        ?.damacai3Plus3D;

      if (damacaiNeedsOfficialSupplement(merged)) {
        console.log(`[skip] ${drawDate} — v2 merge did not yield 3+3D prizes`);
        skipped += 1;
        continue;
      }

      console.log(
        `[${dryRun ? "dry-run" : "patch"}] ${drawDate} ${summarize333(before)} → ${summarize333(after)}`
      );

      if (!dryRun) {
        try {
          await upsertDrawResults({ damacai: merged }, drawDate, "west");
          patched += 1;
        } catch (e) {
          errors.push(
            `${drawDate}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      } else {
        patched += 1;
      }
    }

    if (v2Rows.length < PAGE) break;
    offset += PAGE;
  }

  console.log(
    `[backfill-damacai-333] done scanned=${scanned} wouldPatch=${patched} skipped=${skipped} errors=${errors.length}`
  );
  if (errors.length) {
    for (const e of errors.slice(0, 20)) console.error(e);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
