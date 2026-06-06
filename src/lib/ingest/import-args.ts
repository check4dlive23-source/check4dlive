export interface HistoryImportArgs {
  from: string;
  to: string;
  delay: number;
}

export function parseHistoryImportArgs(defaultFrom: string): HistoryImportArgs {
  const today = new Date().toISOString().slice(0, 10);
  let from = defaultFrom;
  let to = today;
  let delay = 250;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--from=")) from = arg.slice(7);
    else if (arg.startsWith("--to=")) to = arg.slice(5);
    else if (arg.startsWith("--delay=")) delay = Number(arg.slice(8)) || 250;
  }

  return { from, to, delay };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function addDaysIso(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

const DRAW_DAYS = [0, 3, 6];

export function isMytDrawDay(dateIso: string): boolean {
  const [y, m, d] = dateIso.split("-").map(Number);
  const myt = new Date(Date.UTC(y, m - 1, d) + 8 * 60 * 60 * 1000);
  return DRAW_DAYS.includes(myt.getUTCDay());
}

export function iterDates(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    out.push(cursor);
    cursor = addDaysIso(cursor, 1);
  }
  return out;
}
