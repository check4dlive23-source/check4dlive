"use client";
import { useLang } from "@/lib/language-context";
import type { Region } from "@/types";

interface RegionTabsProps {
  active: Region;
  onChange: (region: Region) => void;
}

const regions: Region[] = ["west", "east", "singapore"];
const regionKeys = {
  west: "westMY",
  east: "eastMY",
  singapore: "singapore",
} as const;

const regionFlags = {
  west: "🇲🇾",
  east: "🏝",
  singapore: "🇸🇬",
};

export function RegionTabs({ active, onChange }: RegionTabsProps) {
  const { t } = useLang();
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: "4px 0" }}>
      {regions.map((r) => {
        const isActive = active === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              border: isActive ? "1px solid rgba(0,229,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
              background: isActive ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.03)",
              color: isActive ? "#00E5FF" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {regionFlags[r]} {t(regionKeys[r])}
          </button>
        );
      })}
    </div>
  );
}
