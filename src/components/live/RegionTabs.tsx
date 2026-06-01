"use client";

import type { Region } from "@/types";
import { regionLabels } from "@/lib/mock-data";

interface RegionTabsProps {
  active: Region;
  onChange: (region: Region) => void;
}

const regions: Region[] = ["west", "east", "cambodia", "singapore"];

export function RegionTabs({ active, onChange }: RegionTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {regions.map((r) => {
        const { flag, label } = regionLabels[r];
        const isActive = active === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-surface-4 text-foreground border border-line-strong"
                : "bg-surface-2 text-muted border border-transparent hover:bg-surface-3 hover:text-foreground"
            }`}
          >
            {flag} {label}
          </button>
        );
      })}
    </div>
  );
}
