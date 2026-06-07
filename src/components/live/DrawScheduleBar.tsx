"use client";

import { useEffect, useState } from "react";
import { getRefreshIntervalLabelKey } from "@/lib/draw-time";
import { useLang } from "@/lib/language-context";
import { getNextDrawDate } from "@/lib/next-draw";
import type { Region } from "@/types";

interface DrawScheduleBarProps {
  region: Region;
  isLive: boolean;
}

export function DrawScheduleBar({ region, isLive }: DrawScheduleBarProps) {
  const { t } = useLang();
  const [refreshLabel, setRefreshLabel] = useState("");
  const [nextDrawText, setNextDrawText] = useState("");

  useEffect(() => {
    const update = () => {
      const next = getNextDrawDate(region);
      setNextDrawText(`${next.day} ${next.dateLabel}`);
      setRefreshLabel(t(getRefreshIntervalLabelKey(region)));
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [region, t]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-3">
      <p className="text-xs text-muted rounded-lg border border-line bg-surface-2 px-3 py-2 text-center sm:text-left">
        {t("nextDraw")}: {nextDrawText || "—"}
        <span className="text-dim mx-2 hidden sm:inline">|</span>
        <span className="block sm:inline mt-1 sm:mt-0">
          {t("autoUpdate")}: {refreshLabel || "—"}
        </span>
        {isLive && (
          <>
            <span className="text-dim mx-2 hidden sm:inline">|</span>
            <span className="block sm:inline text-live">
              {t("duringLiveDraw")}: {t("every3Sec")}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
