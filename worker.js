/**
 * 开彩 LIVE — Cloudflare Worker
 * 抓取 check4dresult.com 的 HTML，解析成干净的 JSON
 * 部署到 Cloudflare Workers，绑定 KV namespace "KV4D"
 */

const SOURCE_MY = 'https://www.check4dresult.com/';
const SOURCE_KH = 'https://www.check4dresult.com/';  // GD Lotto 在主页
const SOURCE_SG = 'https://www.check4dresult.com/singapore';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://www.google.com/',
};

// ── CORS HEADERS ──
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json;charset=utf-8',
  'Cache-Control': 'public, max-age=25',
};

// ── LOTTERY ID MAPPING ──
// Maps our internal IDs to CSS selectors / text patterns on check4dresult.com
const LOTTERY_MAP = {
  my: {
    magnum:   { namePattern: /magnum/i,   selector: 'magnum' },
    damacai:  { namePattern: /da ma cai|damacai/i, selector: 'damacai' },
    toto:     { namePattern: /sports toto/i, selector: 'toto' },
    sabah:    { namePattern: /sabah/i,    selector: 'sabah' },
    sarawak:  { namePattern: /cash sweep|sarawak/i, selector: 'sarawak' },
    sandakan: { namePattern: /sandakan/i, selector: 'sandakan' },
  },
  kh: {
    gd:      { namePattern: /grand dragon/i, selector: 'gd' },
    perdana: { namePattern: /perdana/i,       selector: 'perdana' },
    hari:    { namePattern: /hari hari/i,     selector: 'hari' },
  },
  sg: {
    sgpools: { namePattern: /singapore|sg pools/i, selector: 'sgpools' },
  }
};

// ── MAIN HANDLER ──
export default {
  // HTTP requests from browser
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (url.pathname === '/api/results') {
      return handleResults(env, ctx);
    }

    // Serve static files from Pages (handled by Pages binding)
    return new Response('Not found', { status: 404 });
  },

  // Scheduled cron trigger — runs every 30 seconds
  // (Cloudflare free tier: minimum 1 minute, so we fetch on every request too)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scrapeAndCache(env));
  },
};

// ── SERVE CACHED RESULTS ──
async function handleResults(env, ctx) {
  try {
    // Try KV cache first
    let cached = null;
    if (env.KV4D) {
      cached = await env.KV4D.get('results', { type: 'json' });
    }

    // If cache is fresh (< 25s), return it
    if (cached && Date.now() - cached.ts < 25000) {
      return new Response(JSON.stringify(cached), { headers: CORS });
    }

    // Otherwise scrape fresh (and cache in background)
    const fresh = await scrapeAll();
    if (env.KV4D) {
      ctx.waitUntil(env.KV4D.put('results', JSON.stringify(fresh), { expirationTtl: 120 }));
    }
    return new Response(JSON.stringify(fresh), { headers: CORS });

  } catch (e) {
    // Return stale cache if available
    if (env.KV4D) {
      const stale = await env.KV4D.get('results', { type: 'json' });
      if (stale) return new Response(JSON.stringify(stale), { headers: CORS });
    }
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}

// ── SCRAPE ALL SOURCES ──
async function scrapeAll() {
  const [htmlMY, htmlSG] = await Promise.all([
    fetchHtml(SOURCE_MY),
    fetchHtml(SOURCE_SG),
  ]);

  const myResults = parseMalaysia(htmlMY);
  const sgResults = parseSingapore(htmlSG);
  const khResults = extractCambodia(htmlMY); // GD Lotto is in main page

  return {
    ts: Date.now(),
    my: myResults,
    kh: khResults,
    sg: sgResults,
  };
}

async function scrapeAndCache(env) {
  const data = await scrapeAll();
  if (env.KV4D) {
    await env.KV4D.put('results', JSON.stringify(data), { expirationTtl: 120 });
  }
}

// ── FETCH HTML ──
async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS, cf: { cacheTtl: 20, cacheEverything: false } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ── PARSE HELPERS ──
// Extract 4-digit numbers from a text block
function extract4D(text, count) {
  const matches = text.match(/\b\d{4}\b/g) || [];
  return [...new Set(matches)].slice(0, count);
}

// Extract draw number e.g. "#375/26"
function extractDrawNo(text) {
  const m = text.match(/#?(\d+\/\d+)/);
  return m ? m[1] : null;
}

// Extract draw date e.g. "31/05/2026"
function extractDate(text) {
  const m = text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
  return m ? m[1] : null;
}

// Extract RM amount e.g. "9,310,768.80"
function extractRM(text) {
  const m = text.match(/[\d,]+\.\d{2}/);
  return m ? `RM ${m[0]}` : null;
}

// Parse a lottery card block from the HTML
function parseLotteryBlock(html, namePattern) {
  // Find the card containing this lottery
  // check4dresult uses div.result-card or similar structure
  // We do a broad regex search for the lottery name, then extract surrounding numbers

  const idx = html.search(namePattern);
  if (idx === -1) return null;

  // Take a window of HTML around that match
  const window = html.slice(Math.max(0, idx - 200), idx + 3000);

  const first = (extract4D(window, 30)[0]) || null;
  const allNums = extract4D(window, 30);
  const second = allNums[1] || null;
  const third = allNums[2] || null;
  const special = allNums.slice(3, 13);
  const consolation = allNums.slice(13, 23);

  const drawNo = extractDrawNo(window);
  const drawDate = extractDate(window);

  // Status detection
  const hasDash = /----/.test(window.slice(0, 500));
  const status = !first ? 'pending' : hasDash ? 'live' : 'completed';

  // Jackpot
  const jp1 = extractRM(window.slice(window.indexOf('Jackpot 1') > 0 ? window.indexOf('Jackpot 1') : 0, window.indexOf('Jackpot 1') + 200));
  const jp2 = extractRM(window.slice(window.indexOf('Jackpot 2') > 0 ? window.indexOf('Jackpot 2') : 0, window.indexOf('Jackpot 2') + 200));

  return { drawNo, drawDate, status, prizes: { first, second, third }, special, consolation, jackpot1: jp1, jackpot2: jp2 };
}

// ── PARSE MALAYSIA ──
function parseMalaysia(html) {
  const results = {};
  const map = { ...LOTTERY_MAP.my };
  for (const [id, cfg] of Object.entries(map)) {
    const parsed = parseLotteryBlock(html, cfg.namePattern);
    if (parsed) results[id] = { id, ...parsed };
  }
  return results;
}

// ── PARSE CAMBODIA (from main page) ──
function extractCambodia(html) {
  const results = {};
  const map = LOTTERY_MAP.kh;
  for (const [id, cfg] of Object.entries(map)) {
    const parsed = parseLotteryBlock(html, cfg.namePattern);
    if (parsed) results[id] = { id, ...parsed };
  }
  return results;
}

// ── PARSE SINGAPORE ──
function parseSingapore(html) {
  const results = {};
  const parsed = parseLotteryBlock(html, /singapore.*pools|sg.*4d/i);
  if (parsed) results['sgpools'] = { id: 'sgpools', ...parsed };
  return results;
}
