import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const FROM = process.argv[2] || "2025-01-01";
const TO = process.argv[3] || "2025-12-31";
const API = process.env.IMPORT_HTML_BASE
  ? `${process.env.IMPORT_HTML_BASE.replace(/\/$/, "")}/api/admin/import-html`
  : "https://localhost:3010/api/admin/import-html";

function loadSecret() {
  if (process.env.INGEST_SECRET) return process.env.INGEST_SECRET;
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  const path = join(process.cwd(), ".env.local");
  if (existsSync(path)) {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^INGEST_SECRET=(.*)$/);
      if (m) return m[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  return "check4dlive_secret_2024";
}

const SECRET = loadSecret();

function parseYmd(dateIso) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return { y, m, d };
}

function addDaysIso(dateIso, days) {
  const { y, m, d } = parseYmd(dateIso);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split("T")[0];
}

/** Wed/Sat/Sun draw days in MYT (matches bulk-import) */
function isMytDrawDay(dateIso) {
  const { y, m, d } = parseYmd(dateIso);
  const myt = new Date(Date.UTC(y, m - 1, d) + 8 * 60 * 60 * 1000);
  return [0, 3, 6].includes(myt.getUTCDay());
}

function getDrawDates(from, to) {
  const dates = [];
  let cur = from;
  while (cur <= to) {
    if (isMytDrawDay(cur)) dates.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return dates;
}

async function run() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "Asia/Kuala_Lumpur",
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  const dates = getDrawDates(FROM, TO);
  console.log(`Scraping ${dates.length} draw days from ${FROM} to ${TO}`);
  console.log(`Import API: ${API}`);

  let totalInserted = 0;
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const url = `https://www.check4d.org/past-results/${date}`;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
      const html = await page.content();

      if (html.length < 5000) {
        console.log(`[${i + 1}/${dates.length}] ${date}: empty page, skipping`);
        continue;
      }

      if (!html.includes("resultTable2")) {
        console.log(`[${i + 1}/${dates.length}] ${date}: no results table, skipping`);
        continue;
      }

      const res = await fetch(API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html, date }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(
          `[${i + 1}/${dates.length}] ${date}: API error ${data.error ?? res.status}`
        );
        continue;
      }
      totalInserted += data.inserted || 0;
      console.log(
        `[${i + 1}/${dates.length}] ${date}: +${data.inserted || 0} inserted (total: ${totalInserted})`
      );

      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.log(`[${i + 1}/${dates.length}] ${date}: ERROR ${e.message}`);
    }
  }

  await context.close();
  await browser.close();
  console.log(`\nDONE! Total inserted: ${totalInserted}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
