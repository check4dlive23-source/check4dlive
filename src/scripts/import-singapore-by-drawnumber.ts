/**
 * Import Singapore Pools 4D history by Draw Number range
 * Source: singaporepools.com.sg/en/product/Pages/4d_results.aspx
 * Run: npm run import:singapore:bydraw
 */
import { loadEnvLocal } from "@/lib/script-env";
import { createServerClient } from "@/lib/supabase/server";
import { parseSingaporeResultsHtml } from "@/lib/ingest/singapore-api";
import { upsertDrawResultsV2 } from "@/lib/draw-results-v2";
import { sleep } from "@/lib/ingest/import-args";

loadEnvLocal();

const RESULTS_PAGE = "https://www.singaporepools.com.sg/en/product/Pages/4d_results.aspx";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

function drawNumberToQueryString(drawNumber: number): string {
  const plain = `DrawNumber=${drawNumber}`;
  const base64 = Buffer.from(plain).toString("base64");
  return `sppl=${base64}`;
}

async function main() {
  const fromArg = process.argv.find((a) => a.startsWith("--from="))?.split("=")[1];
  const toArg = process.argv.find((a) => a.startsWith("--to="))?.split("=")[1];
  const delayArg = process.argv.find((a) => a.startsWith("--delay="))?.split("=")[1];

  const fromDraw = fromArg ? parseInt(fromArg) : 1;
  const toDraw = toArg ? parseInt(toArg) : 2602;
  const delay = delayArg ? parseInt(delayArg) : 500;

  const supabase = createServerClient();
  if (!supabase) {
    console.error("Supabase not configured");
    process.exit(1);
  }

  console.log(`[sg-bydraw] Importing Draw No ${fromDraw} → ${toDraw}`);

  let upserted = 0;
  let skip = 0;
  const errors: string[] = [];

  for (let drawNo = fromDraw; drawNo <= toDraw; drawNo++) {
    const qs = drawNumberToQueryString(drawNo);
    const url = `${RESULTS_PAGE}?${qs}`;

    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) {
        skip++;
        if (drawNo % 100 === 0) console.log(`[sg-bydraw] ${drawNo}/${toDraw} upserted=${upserted} skip=${skip}`);
        await sleep(delay);
        continue;
      }
      const html = await res.text();
      const row = parseSingaporeResultsHtml(html);
      if (!row) {
        skip++;
        if (drawNo <= 10) {
          console.log(`[debug] Draw#${drawNo} HTML snippet:`, html.slice(0, 500));
        }
      } else {
        const result = await upsertDrawResultsV2(supabase, [row]);
        upserted += result.upserted;
        errors.push(...result.errors);
      }
    } catch (e) {
      errors.push(`Draw#${drawNo}: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (drawNo % 100 === 0) {
      console.log(`[sg-bydraw] ${drawNo}/${toDraw} upserted=${upserted} skip=${skip}`);
    }
    await sleep(delay);
  }

  console.log(`[sg-bydraw] Done. upserted=${upserted} skip=${skip} errors=${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 20).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
