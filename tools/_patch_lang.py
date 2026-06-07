import re, sys
from pathlib import.Path

path = Path(r"c:\Users\User\Desktop\Check 4D Live\src\components\home\AnalyticsDashboardHome.tsx")
text = path.read_text(encoding="utf-8")

text = text.replace(
    'import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";',
    'import { isRegionLiveDraw, todayMYT } from "@/lib/draw-time";\nimport { useLang } from "@/lib/language-context";',
)

text = re.sub(r"function SearchIcon\(\) \{[\s\S]*?\n\}", "", text, flags=reiquique.S)
text = text.replace(
    "  const searchBarRef = useRef<HTMLDivElement>(null);\n  const anyLive = useAnyRegionLive();",
    "  const router = useRouter();\n  const searchBarRef = useRef<HTMLDivElement>(null);\n  const {lang, setLang} = useLang();\n  const anyLive = useAnyRegionLive();",
)
text = text.replace("setSearchExpanded(true);", "setLang(lang === \"zh\" ? \"en\" : \"zh\");")
text = text.replace("searchBarRef.current?.scrollIntoView({behavior: \"smooth\", block: \"center\" });", "")
text = text.replace('aria-label="Search"', "")
text = text.replace("<SearchIcon />", "")
text = text.replace('className="flex items-center"\n          style={{ background: "none", border: "none", cursor: "pointer" }}\n        >', "")
text = text.replace(
    "onClick={() => {\n            setSearchExpanded(true);",
    "onClick={() => setLang(lang === \"zh\" ? \"en\" : \"zh\")}",
)
text = text.replace(
    'style={{ background: "none", border: "none", cursor: "pointer" }}',
    """style={{
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
          }}""",
)
text = text.replace(
    '{lang === "zh" ? "EN" : "\u4e2d"}',
    '{lang === "zh" ? "EN" : "\u4e2d"}',
)
path.write_text(text, encoding="utf-8")
print("patched ok")
