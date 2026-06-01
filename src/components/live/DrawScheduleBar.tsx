"use client";

import { useLang } from "@/lib/language-context";
import { getNextDrawDate } from "@/lib/next-draw";
import type { Region } from "@/types";

interface DrawScheduleBarProps {
  region: Region;
  isLive: boolean;
}

export function DrawScheduleBar({ region, isLive }: DrawScheduleBarProps) {
  const { t } = useLang();
  const next = getNextDrawDate(region);
  return (
    <div className="mx-auto max-w-7xl px-4 pb-3">
      <p className="text-xs text-muted rounded-lg border border-line bg-surface-2 px-3 py-2 text-center sm:text-left">
        {t("nextDraw")}: {next.day} {next.dateLabel}
        <span className="text-dim mx-2 hidden sm:inline">|</span>
        <span className="block sm:inline mt-1 sm:mt-0">
          {t("autoUpdate")}: {isLive ? t("every15Sec") : t("every30Sec")}
        </span>
        {isLive && (
          <>
            <span className="text-dim mx-2 hidden sm:inline">|</span>
            <span className="block sm:inline text-live">
              {t("duringLiveDraw")}: {t("every15Sec")}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
