import fs from "fs";
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["tmp-home.html", "tmp-sabah.html", "tmp-gd.html", "tmp-perdana.html", "tmp-east.html", "tmp-cambodia.html"];
for (const f of files) {
  try {
    const h = fs.readFileSync(f, "utf8");
    const companies = [...new Set([...h.matchAll(/Company:"([^"]+)"/g)].map((m) => m[1]))];
    console.log(f, companies.length ? companies.join(", ") : "(none)");
  } catch {
    console.log(f, "(missing)");
  }
}
