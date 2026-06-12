import fs from "node:fs";
import path from "node:path";
import { generateBriefPreview } from "@/lib/vyra/generate-briefs";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const region = (process.argv[2] ?? "west") as "west" | "east" | "singapore";
const lang = (process.argv[3] ?? "zh") as "zh" | "en";
const date = process.argv[4];

async function main() {
  const result = await generateBriefPreview(region, lang, date);
  if (!result.ok) {
    console.error("ERROR:", result.error);
    process.exit(1);
  }

  const { briefData, narrative } = result;
  console.log(`=== VYRA Brief ${region}/${lang} ${briefData.date} ===`);
  console.log(`quiet=${briefData.quiet} signals=${briefData.signals.length}`);
  console.log("\n--- INTRO ---");
  console.log(narrative.intro);
  console.log("\n--- NARRATIVE ---");
  for (const seg of narrative.narrative) {
    const sig = briefData.signals[seg.signalIndex];
    console.log(`[${seg.signalIndex}] ${sig?.type ?? "?"}: ${seg.text}`);
  }
}

main();
