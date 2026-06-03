#!/usr/bin/env node
/**
 * Scrape check4d.org past results (browser UA + optional cookies) and POST HTML
 * to the local import-html API.
 *
 * Usage:
 *   node scripts/scrape-history.mjs --from 2025-01-01 --to 2025-01-31
 *   node scripts/scrape-history.mjs --from 2025-01-04 --to 2025-01-04 --cookie-file cookies.txt
 *
 * Env:
 *   INGEST_SECRET or CRON_SECRET — API bearer token (default: read from .env.local)
 *   CHECK4D_COOKIE — optional Cookie header value
 *   IMPORT_HTML_BASE — default http://localhost:3010
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DRAW_DAYS_WSS = [0, 3, 6]; // Sun, Wed, Sat (MYT)

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Referer: "https://www.check4d.org/",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

const CHECK4D_BASE = "https://www.check4d.org/past-results";

function parseArgs(argv) {
  const out = {
    from: "2010-01-01",
    to: new Date().toISOString().split("T")[0],
    cookieFile: null,
    baseUrl: process.env.IMPORT_HTML_BASE ?? "http://localhost:3010",
    delayMs: 1000,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from" && argv[i + 1]) out.from = argv[++i];
    else if (a === "--to" && argv[i + 1]) out.to = argv[++i];
    else if (a === "--cookie-file" && argv[i + 1]) out.cookieFile = argv[++i];
    else if (a === "--base-url" && argv[i + 1]) out.baseUrl = argv[++i];
    else if (a === "--delay" && argv[i + 1]) out.delayMs = Number(argv[++i]) || 1000;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node scripts/scrape-history.mjs --from YYYY-MM-DD --to YYYY-MM-DD
  --cookie-file path.txt   Cookie header (one line, from browser DevTools)
  --base-url http://localhost:3010
  --delay 1000             ms between requests`);
      process.exit(0);
    }
  }
  return out;
}

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

function readCookieFile(path) {
  if (!path || !existsSync(path)) return "";
  return readFileSync(path, "utf8").trim().split(/\r?\n/)[0].trim();
}

function parseYmd(dateIso) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return { y, m, d };
}

function toIsoDate(d) {
  return d.toISOString().split("T")[0];
}

function addDaysIso(dateIso, days) {
  const { y, m, d } = parseYmd(dateIso);
  return toIsoDate(new Date(Date.UTC(y, m - 1, d + days)));
}

function isMytDrawDay(dateIso) {
  const { y, m, d } = parseYmd(dateIso);
  const myt = new Date(Date.UTC(y, m - 1, d) + 8 * 60 * 60 * 1000);
  return DRAW_DAYS_WSS.includes(myt.getUTCDay());
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCheck4dPage(dateIso, cookie) {
  const headers = { ...BROWSER_HEADERS };
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${CHECK4D_BASE}/${dateIso}`, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });

  const html = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    contentLength: res.headers.get("content-length") ?? String(html.length),
    html,
  };
}

async function postImportHtml(baseUrl, secret, dateIso, html) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/import-html`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html, date: dateIso }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? data.reason ?? `import-html ${res.status}`);
  }
  return data;
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv);
  const secret =
    process.env.INGEST_SECRET ?? process.env.CRON_SECRET ?? "";
  const cookie =
    process.env.CHECK4D_COOKIE ?? readCookieFile(args.cookieFile) ?? "";

  if (!secret) {
    console.error("Missing INGEST_SECRET or CRON_SECRET in env / .env.local");
    process.exit(1);
  }

  if (cookie) {
    console.log("Using Cookie header (" + cookie.length + " chars)");
  } else {
    console.log("No cookie set — use CHECK4D_COOKIE or --cookie-file if blocked");
  }

  console.log(`Range: ${args.from} → ${args.to}`);
  console.log(`Import API: ${args.baseUrl}/api/admin/import-html`);

  let cursor = args.from;
  let scraped = 0;
  let insertedTotal = 0;
  let skippedDays = 0;
  let failed = 0;

  while (cursor <= args.to) {
    if (!isMytDrawDay(cursor)) {
      skippedDays++;
      cursor = addDaysIso(cursor, 1);
      continue;
    }

    process.stdout.write(`[${cursor}] fetch check4d.org ... `);

    try {
      const page = await fetchCheck4dPage(cursor, cookie);
      console.log(
        `HTTP ${page.status}, len=${page.contentLength}`
      );

      if (!page.ok || page.html.length < 1000) {
        console.warn(`  skip: empty or error response`);
        failed++;
        cursor = addDaysIso(cursor, 1);
        await sleep(args.delayMs);
        continue;
      }

      if (!page.html.includes("resultTable2")) {
        console.warn(`  skip: no result tables in HTML (bot page?)`);
        failed++;
        cursor = addDaysIso(cursor, 1);
        await sleep(args.delayMs);
        continue;
      }

      process.stdout.write(`  import-html ... `);
      const result = await postImportHtml(
        args.baseUrl,
        secret,
        cursor,
        page.html
      );
      console.log(
        `inserted=${result.inserted} operators=[${(result.operators ?? []).join(", ")}]`
      );

      scraped++;
      insertedTotal += result.inserted ?? 0;
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      failed++;
    }

    cursor = addDaysIso(cursor, 1);
    await sleep(args.delayMs);
  }

  console.log("\nDone.");
  console.log({
    drawDaysProcessed: scraped,
    insertedTotal,
    failed,
    skippedNonDrawDays: skippedDays,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
