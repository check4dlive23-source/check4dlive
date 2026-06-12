import type { DrawResultV2Row } from "@/lib/draw-results-v2";

const SG_BASE = "https://www.singaporepools.com.sg";
const ARCHIVE = `${SG_BASE}/DataFileArchive/Lottery/Output/`;
const RESULTS_PAGE = `${SG_BASE}/en/product/Pages/4d_results.aspx`;
const SOURCE = "singaporepools.com.sg";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

const MONTHS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function isValid4d(n: string): boolean {
  return /^\d{4}$/.test(n);
}

/** "Wed, 27 May 2026" → YYYY-MM-DD */
export function sgDisplayDateToIso(label: string): string | null {
  const m = label.trim().match(/\w+,\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!m) return null;
  const mm = MONTHS[m[2]];
  if (!mm) return null;
  const dd = m[1].padStart(2, "0");
  return `${m[3]}-${mm}-${dd}`;
}

export interface SgDrawRef {
  drawNumber: string;
  queryString: string;
  drawDate: string;
  label: string;
}

export async function fetchSgDrawList(): Promise<SgDrawRef[]> {
  const res = await fetch(`${ARCHIVE}fourd_result_draw_list_en.html`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SG draw list HTTP ${res.status}`);
  const html = await res.text();

  const out: SgDrawRef[] = [];
  const re =
    /<option value=['"](\d+)['"] queryString=['"]([^'"]*)['"][^>]*>([^<]*)<\/option>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const label = m[3].trim();
    const drawDate = sgDisplayDateToIso(label);
    if (!drawDate) continue;
    out.push({
      drawNumber: m[1],
      queryString: m[2],
      drawDate,
      label,
    });
  }
  return out;
}

function cellNumbers(html: string, className: string): string[] {
  const re = new RegExp(
    `class=["']${className}["'][^>]*>(\\d{4})`,
    "gi"
  );
  return Array.from(html.matchAll(re), (m) => m[1]).filter(isValid4d);
}

function tbodyNumbers(html: string, className: string): string[] {
  const block = html.match(
    new RegExp(`<tbody class='${className}'>([\\s\\S]*?)</tbody>`, "i")
  );
  if (!block) return [];
  return Array.from(block[1].matchAll(/>(\d{4})</g), (m) => m[1]).filter(
    isValid4d
  );
}

export function parseSingaporeResultsHtml(html: string): DrawResultV2Row | null {
  const dateM = html.match(/class='drawDate'[^>]*>([^<]+)</i);
  const drawM = html.match(/class='drawNumber'[^>]*>Draw No\.\s*(\d+)/i);
  if (!dateM) return null;

  const draw_date = sgDisplayDateToIso(dateM[1]);
  if (!draw_date) return null;

  const first = cellNumbers(html, "tdFirstPrize")[0];
  if (!first) return null;

  return {
    draw_date,
    draw_no: drawM?.[1] ?? null,
    operator: "singapore",
    first_prize: first,
    second_prize: cellNumbers(html, "tdSecondPrize")[0] ?? null,
    third_prize: cellNumbers(html, "tdThirdPrize")[0] ?? null,
    special_numbers: tbodyNumbers(html, "tbodyStarterPrizes"),
    consolation_numbers: tbodyNumbers(html, "tbodyConsolationPrizes"),
    extra_data: null,
    source: SOURCE,
  };
}

export async function fetchSingaporeDraw(
  ref: SgDrawRef
): Promise<DrawResultV2Row | null> {
  const url = `${RESULTS_PAGE}?${ref.queryString}`;
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`SG draw HTTP ${res.status}`);
  const html = await res.text();
  return parseSingaporeResultsHtml(html);
}

const TOTO_RESULTS_PAGE = `${SG_BASE}/en/product/sr/Pages/toto_results.aspx`;
const FETCH_TIMEOUT_MS = 10_000;

export interface SgTotoLatest {
  balls: number[];
  additional: number;
  group1Prize: number;
  group2Share?: number;
  draw_no: string;
  date: string;
}

function parseSgMoney(raw: string): number | null {
  const cleaned = raw.replace(/\$/g, "").replace(/,/g, "").trim();
  if (!cleaned || cleaned === "-") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** First draw block on page (latest result). */
function firstTotoDrawBlock(html: string): string {
  const chunk = html.split(/Winning Ticket Details/i)[0] ?? html;
  const firstIdx = chunk.search(/Draw No\.?\s*\d+/i);
  if (firstIdx < 0) return chunk;
  const rest = chunk.slice(firstIdx + 12);
  const secondIdx = rest.search(/Draw No\.?\s*\d+/i);
  if (secondIdx > 0) return chunk.slice(0, firstIdx + 12 + secondIdx);
  return chunk;
}

function sliceBetween(html: string, start: string, end: string): string {
  const from = html.indexOf(start);
  if (from < 0) return "";
  const body = html.slice(from + start.length);
  const to = body.indexOf(end);
  return to < 0 ? body.slice(0, 800) : body.slice(0, to);
}

function extractBallInts(section: string, max: number, count: number): number[] {
  const out: number[] = [];
  for (const m of section.matchAll(/>(\d{1,2})</g)) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= 1 && n <= max) out.push(n);
    if (out.length >= count) break;
  }
  return out;
}

export function parseSgTotoResultsHtml(html: string): SgTotoLatest | null {
  const block = firstTotoDrawBlock(html);

  const dateM =
    block.match(/class=['"]drawDate['"][^>]*>([^<]+)</i) ??
    block.match(/(\w{3},\s*\d{1,2}\s+\w{3}\s+\d{4})/i);
  const drawM = block.match(/Draw No\.?\s*(\d+)/i);
  if (!dateM || !drawM) return null;

  const date = sgDisplayDateToIso(dateM[1]);
  if (!date) return null;

  const winSection = sliceBetween(block, "Winning Numbers", "Additional Number");
  const balls = extractBallInts(winSection, 49, 6);
  if (balls.length !== 6) return null;

  const addSection = sliceBetween(block, "Additional Number", "Group 1 Prize");
  const additional = extractBallInts(addSection, 49, 1)[0];
  if (!additional) return null;

  const g1Section = sliceBetween(block, "Group 1 Prize", "Winning Shares");
  const g1M = g1Section.match(/\$\s*([\d,]+)/);
  const group1Prize = g1M ? parseSgMoney(g1M[0]) : null;
  if (group1Prize == null) return null;

  let group2Share: number | undefined;
  const sharesIdx = block.indexOf("Winning Shares");
  if (sharesIdx >= 0) {
    const sharesBlock = block.slice(sharesIdx, sharesIdx + 1200);
    const g2M = sharesBlock.match(
      /Group\s*2[\s\S]*?\$\s*([\d,]+)/i
    );
    if (g2M) {
      const parsed = parseSgMoney(`$${g2M[1]}`);
      if (parsed != null) group2Share = parsed;
    }
  }

  return {
    balls,
    additional,
    group1Prize,
    group2Share,
    draw_no: drawM[1],
    date,
  };
}

export async function fetchSgTotoLatest(): Promise<SgTotoLatest | null> {
  try {
    const res = await fetch(TOTO_RESULTS_PAGE, {
      headers: HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[sg-toto] HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();
    const parsed = parseSgTotoResultsHtml(html);
    if (!parsed) console.warn("[sg-toto] parse returned null");
    return parsed;
  } catch (e) {
    console.warn(
      "[sg-toto] fetch failed:",
      e instanceof Error ? e.message : e
    );
    return null;
  }
}
