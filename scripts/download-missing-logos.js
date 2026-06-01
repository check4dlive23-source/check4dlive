const https = require("https");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../public/logos");
const candidates = [
  ["sandakan.gif", "https://www.4dmoon.com/images/logo_stc4d.gif"],
  ["sandakan.gif", "https://www.4dmoon.com/images/logo_stc.gif"],
  ["sandakan.gif", "https://www.4dmoon.com/images/logo_sandakan4d.gif"],
  ["perdana.gif", "https://www.4dmoon.com/images/logo_perdana.gif"],
  ["perdana.gif", "https://www.4dmoon.com/images/logo_perdana4d.gif"],
  ["hari.gif", "https://www.4dmoon.com/images/logo_lucky.gif"],
  ["hari.gif", "https://www.4dmoon.com/images/logo_harihari.gif"],
  ["hari.gif", "https://www.4dmoon.com/images/logo_luckyharihari.gif"],
  ["sgpools.gif", "https://www.4dmoon.com/images/logo_singaporepools.gif"],
  ["sgpools.gif", "https://www.4dmoon.com/images/logo_sg4d.gif"],
  ["sgpools.gif", "https://www.4dmoon.com/images/logo_spools.gif"],
];

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
  fs.mkdirSync(dir, { recursive: true });
  const done = new Set();

  for (const [name, url] of candidates) {
    if (done.has(name)) continue;
    try {
      const buf = await get(url);
      const head = buf.toString("utf8", 0, 20);
      if (buf.length > 500 && !head.includes("<html")) {
        fs.writeFileSync(path.join(dir, name), buf);
        console.log("OK", name, url, buf.length + "b");
        done.add(name);
      } else {
        console.log("FAIL", name, url, buf.length + "b");
      }
    } catch (e) {
      console.log("ERR", name, e.message);
    }
  }
}

main();
