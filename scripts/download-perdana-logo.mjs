import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "public", "logos", "perdana.png");

fs.mkdirSync(path.dirname(out), { recursive: true });

https
  .get(
    "https://www.perdana4d.com/img/companyLogo_lg.png",
    {
      headers: {
        Referer: "https://www.perdana4d.com/",
        "User-Agent": "Mozilla/5.0",
      },
    },
    (res) => {
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        if (buf.length > 500) {
          fs.writeFileSync(out, buf);
          console.log("✅ perdana.png", buf.length, "bytes");
        } else {
          console.log("❌ failed", buf.length, "bytes");
          process.exit(1);
        }
      });
    }
  )
  .on("error", (e) => {
    console.log("ERR", e.message);
    process.exit(1);
  });
