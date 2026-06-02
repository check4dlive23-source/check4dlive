const fs = require("fs");

const h = fs.readFileSync("tmp-home.html", "utf8");

function blockFor(company) {
  const tag = `Company:\"${company}\"`;
  const idx = h.indexOf(tag);
  if (idx < 0) return null;
  let start = idx;
  while (start > 0 && h[start] !== "{") start--;
  let depth = 0;
  let end = start;
  for (let i = start; i < h.length; i++) {
    if (h[i] === "{") depth++;
    else if (h[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return h.slice(start, end);
}

function grab(block, name) {
  if (!block) return null;
  const m = block.match(new RegExp(name + `:\\\"([^\\\"]*)\\\"`));
  return m ? m[1] : null;
}

for (const company of ["MAGNUM4D", "DAMACAI", "SPORTTOTO"]) {
  const b = blockFor(company);
  console.log("\n==", company);
  for (const k of [
    "Jackpot1Amount",
    "Jackpot2Amount",
    "3+3DJackpot1",
    "3+3DJackpot2",
    "StarTotoJackPot1",
    "PowerTotoJackPot",
    "SupremeTotoJackPot",
    "Jackpot1",
    "Jackpot2",
  ]) {
    console.log(k, grab(b, k));
  }
}

