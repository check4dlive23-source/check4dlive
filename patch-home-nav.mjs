import fs from "fs";

const path = "src/components/home/AnalyticsDashboardHome.tsx";
let c = fs.readFileSync(path, "utf8");

c = c.replace(
  'import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";',
  'import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";\nimport { useLang } from "@/lib/language-context";'
);

c = c.replace(
  /function SearchIcon\(\) \{[\s\S]*?\n\}/,
  ""
);

c = c.replace(
  `  const searchBarRef = useRef<HTMLDivElement>(null);
  const anyLive = useAnyRegionLive();`,
  `  const router = useRouter();
  const searchBarRef = useRef<HTMLDivElement>(null);
  const { lang, setLang } = useLang();
  const anyLive = useAnyRegionLive();`
);

const oldHeaderBtn = `        <button
          type="button"
          onClick={() => {
            setSearchExpanded(true);
            searchBarRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          aria-label="Search"
          className="flex items-center"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <SearchIcon />
        </button>`;

const newHeaderBtn = `        <button
          type="button"
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "6px 12px",
            color: "rgba(255,255,255,0.7)",
            fontFamily: "var(--font-jetbrains)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          {lang === "zh" ? "EN" : "中文"}
        </button>`;

if (!c.includes(oldHeaderBtn.slice(0, 40))) {
  console.error("header button not found");
  process.exit(1);
}

c = c.replace(oldHeaderBtn, newHeaderBtn);
fs.writeFileSync(path, c);
console.log("patched");
