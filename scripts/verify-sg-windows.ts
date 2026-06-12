/**
 * Task #39 — verify SG game-level live windows + mergeDrawResult behavior.
 * Run: npx tsx scripts/verify-sg-windows.ts
 */
import {
  getMYTParts,
  isRegionLiveDraw,
  isSgGameLiveDraw,
} from "../src/lib/draw-time";
import { mergeDrawResult } from "../src/lib/results-mapper";
import { singapore4D } from "../src/lib/mock-data";
import type { DbDrawRow } from "../src/lib/results-mapper";

/** Build a Date whose getMYTParts() yields the given MYT calendar + clock. */
function mytDate(isoDate: string, hour: number, minute: number): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 8, minute, 0, 0));
}

function assert(label: string, cond: boolean) {
  console.log(cond ? `  ✓ ${label}` : `  ✗ FAIL: ${label}`);
  if (!cond) process.exitCode = 1;
}

/** Complete sgpools row (2026-06-10) — simulates DB on Thursday Toto night. */
const sgpoolsJun10: DbDrawRow = {
  date: "2026-06-10",
  draw_no: "5123/26",
  operator: "sgpools",
  region: "singapore",
  first_prize: "1234",
  second_prize: "5678",
  third_prize: "9012",
  special_numbers: Array(10).fill("1111"),
  consolation_numbers: Array(10).fill("2222"),
};

console.log("=== Scenario A: Thursday 21:45 MYT (Toto window, not 4D window) ===");
const thu = mytDate("2026-06-11", 21, 45);
const thuParts = getMYTParts(thu);
console.log(`  MYT: ${thuParts.date} D${thuParts.day} ${thuParts.hour}:${String(thuParts.minute).padStart(2, "0")}`);

assert(
  'isRegionLiveDraw("singapore") === true',
  isRegionLiveDraw("singapore", thu) === true
);
assert(
  'isSgGameLiveDraw("sgtoto") === true',
  isSgGameLiveDraw("sgtoto", thu) === true
);
assert(
  'isSgGameLiveDraw("sg4d") === false',
  isSgGameLiveDraw("sg4d", thu) === false
);

const thuMerge = mergeDrawResult(
  singapore4D,
  sgpoolsJun10,
  isSgGameLiveDraw("sg4d", thu),
  "2026-06-11"
);
assert(
  `sgpools status === "drawn" (got "${thuMerge.status}")`,
  thuMerge.status === "drawn"
);
assert(
  `sgpools first_prize preserved (got "${thuMerge.first_prize}")`,
  thuMerge.first_prize === "1234"
);
assert(
  "sgpools not cleared to ----",
  thuMerge.first_prize !== "----"
);

console.log("\n=== Scenario B: Saturday 18:30 MYT (4D window, no today data) ===");
const sat = mytDate("2026-06-13", 18, 30);
const satParts = getMYTParts(sat);
console.log(`  MYT: ${satParts.date} D${satParts.day} ${satParts.hour}:${String(satParts.minute).padStart(2, "0")}`);

assert(
  'isRegionLiveDraw("singapore") === true',
  isRegionLiveDraw("singapore", sat) === true
);
assert(
  'isSgGameLiveDraw("sg4d") === true',
  isSgGameLiveDraw("sg4d", sat) === true
);
assert(
  'isSgGameLiveDraw("sgtoto") === false',
  isSgGameLiveDraw("sgtoto", sat) === false
);

const satMergeNoRow = mergeDrawResult(
  singapore4D,
  null,
  isSgGameLiveDraw("sg4d", sat),
  "2026-06-13"
);
assert(
  `sgpools status === "pending" (got "${satMergeNoRow.status}")`,
  satMergeNoRow.status === "pending"
);
assert(
  'sgpools first_prize === "----"',
  satMergeNoRow.first_prize === "----"
);

console.log("\nDone.");
