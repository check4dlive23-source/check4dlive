import type { DrawResultV2Row } from "@/lib/draw-results-v2";

const BASE = "https://www.sportstoto.com.my";
const SOURCE = "sportstoto.com.my";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

function isValid4d(n: string): boolean {
  return /^\d{4}$/.test(n);
}

/** DD/MM/YYYY → YYYY-MM-DD */
export function totoDateToIso(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function extractDataResultA(block: string): string[] {
  const out: string[] = [];
  const re =
    /class="dataResultA"[\s\S]*?(?:<[^>]+>)*\s*(\d{4})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    if (isValid4d(m[1])) out.push(m[1]);
  }
  return out;
}

export function parseTotoPrintHtml(html: string): DrawResultV2Row | null {
  const dateM = html.match(/Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const drawM = html.match(/Draw\s*No\.\s*([\d/]+)/i);
  if (!dateM || !drawM) return null;

  const draw_date = totoDateToIso(dateM[1]);
  if (!draw_date) return null;

  const blockM = html.match(
    /TOTO\s+4D[\s\S]*?(?=TOTO\s+6D|Toto\s+lotto|Sports\s+Toto\s+Lotto|Star\s+Toto|$)/i
  );
  if (!blockM) return null;

  const nums = extractDataResultA(blockM[0]);
  if (nums.length < 3) return null;

  return {
    draw_date,
    draw_no: drawM[1].trim(),
    operator: "toto",
    first_prize: nums[0],
    second_prize: nums[1],
    third_prize: nums[2],
    special_numbers: nums.slice(3, 13),
    consolation_numbers: nums.slice(13, 23),
    extra_data: null,
    source: SOURCE,
  };
}

export async function fetchTotoHtml(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : `${BASE}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Toto HTTP ${res.status}: ${url}`);
  return res.text();
}

/** Extract draw IDs (e.g. 5783/24) from one results_past.asp month page. */
export function parseTotoPastListingHtml(html: string): string[] {
  const nos = new Set<string>();
  Array.from(
    html.matchAll(/results_past_print\.asp\?drawNo=([^"&]+)/gi)
  ).forEach((m) => nos.add(m[1].trim()));
  Array.from(
    html.matchAll(/class="calendar_drawnumber"[^>]*>\s*([\d/]+)\s*</gi)
  ).forEach((m) => {
    const id = m[1].trim();
    if (/^\d+\/\d{2}$/.test(id)) nos.add(id);
  });
  return Array.from(nos);
}

/** One month on the past-results calendar (site uses date=M/M/YYYY). */
export async function listTotoDrawNosForMonth(
  year: number,
  month: number
): Promise<string[]> {
  const html = await fetchTotoHtml(
    `results_past.asp?date=${month}/${month}/${year}`
  );
  return parseTotoPastListingHtml(html);
}

/** All draw numbers for a calendar year (12 monthly pages, not a single month). */
export async function listTotoDrawNosForYear(year: number): Promise<string[]> {
  const nos = new Set<string>();
  for (let month = 1; month <= 12; month++) {
    const listed = await listTotoDrawNosForMonth(year, month);
    for (const n of listed) nos.add(n);
  }
  return Array.from(nos);
}

export async function fetchTotoDrawByNo(
  drawNo: string
): Promise<DrawResultV2Row | null> {
  const html = await fetchTotoHtml(
    `results_past_print.asp?drawNo=${encodeURIComponent(drawNo)}`
  );
  return parseTotoPrintHtml(html);
}

export function yearsInRange(from: string, to: string): number[] {
  const y0 = parseInt(from.slice(0, 4), 10);
  const y1 = parseInt(to.slice(0, 4), 10);
  const years: number[] = [];
  for (let y = y0; y <= y1; y++) years.push(y);
  return years;
}
