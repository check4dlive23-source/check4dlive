import fs from "fs";

const html = fs.readFileSync("tmp-home.html", "utf8");
const marker = "fourDResult:[";
const start = html.indexOf(marker);
const slice = html.slice(start + marker.length);

function field(block, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = block.match(new RegExp(`(?:^|[,{])${escaped}:"([^"]*)"`));
  return m?.[1];
}

function collect(block, prefix, max) {
  const out = [];
  for (let i = 1; i <= max; i++) {
    const v = field(block, `${prefix}${i}`);
    if (v != null) out.push(v);
  }
  return out;
}

function extractCompanyBlock(s, company) {
  const tag = `Company:"${company}"`;
  const tagIdx = s.indexOf(tag);
  if (tagIdx === -1) return "";
  let objStart = tagIdx;
  while (objStart > 0 && s[objStart] !== "{") objStart--;
  let depth = 0;
  let end = objStart;
  for (let i = objStart; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return s.slice(objStart, end);
}

const block14 = slice.slice(
  slice.indexOf('Company:"MAGNUM4D"'),
  slice.indexOf('Company:"MAGNUM4D"') + 14000
);
const full = extractCompanyBlock(slice, "MAGNUM4D");

const old = [];
for (let i = 1; i <= 13; i++) {
  const m = block14.match(new RegExp(`Special${i}:"([^"]*)"`));
  if (m) old.push(m[1]);
}

console.log("old slice count", old.length, old);
console.log("new slice count", collect(block14, "Special", 13).length);
console.log("full count", collect(full, "Special", 13).length, collect(full, "Special", 13));
