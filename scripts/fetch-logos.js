const https = require("https");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../public/logos");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Referer: "https://www.4dmoon.com/" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

async function main() {
  const html = (await get("https://www.4dmoon.com/")).toString("utf8");
  const logos = Array.from(html.matchAll(/\/images\/logo[^"'\s)]+/gi)).map((m) => m[0]);
  const unique = [...new Set(logos)].sort();
  console.log("Found on page:\n", unique.join("\n"));

  const wanted = [
    ["sandakan.gif", /sandakan|stc/i],
    ["sgpools.gif", /singapore|sgpool|spool/i],
    ["perdana.gif", /perdana/i],
    ["hari.gif", /hari/i],
  ];

  for (const [name, pattern] of wanted) {
    const match = unique.find((u) => pattern.test(u));
    if (match) {
      const url = "https://www.4dmoon.com" + match;
      const buf = await get(url);
      if (buf.length >= 500 && !buf.toString("utf8", 0, 10).includes("<html")) {
        fs.writeFileSync(path.join(dir, name), buf);
        console.log(name, "OK", buf.length, url);
      } else {
        console.log(name, "bad response", buf.length, url);
      }
    } else {
      console.log(name, "no match in page");
    }
  }
}

main().catch(console.error);
