const https = require("https");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../public/logos");
const tries = [
  ["perdana.png", "https://www.gdlotto.net/images/perdana-logo.png"],
  ["perdana.png", "https://cambodia4d.com/images/perdana.png"],
  ["hari.png", "https://www.gdlotto.net/images/lucky-hari-hari-logo.png"],
  ["hari.png", "https://cambodia4d.com/images/lhh.png"],
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
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
  fs.mkdirSync(dir, { recursive: true });
  const got = new Set();
  for (const [name, url] of tries) {
    if (got.has(name)) continue;
    try {
      const buf = await get(url);
      const head = buf.toString("utf8", 0, 20);
      if (buf.length > 500 && !head.includes("<html")) {
        fs.writeFileSync(path.join(dir, name), buf);
        console.log("OK", name, buf.length, url);
        got.add(name);
      } else {
        console.log("FAIL", name, buf.length, url);
      }
    } catch (e) {
      console.log("ERR", name, e.message);
    }
  }
}

main();
