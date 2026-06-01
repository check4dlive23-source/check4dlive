"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { PrizeNumber } from "@/components/ui/PrizeNumber";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, Sabah3DExtra } from "@/types";

interface Sabah3DCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: Sabah3DExtra;
}

export function Sabah3DCard({ date, draw_no, status, data }: Sabah3DCardProps) {
  const revealed = status !== "pending";

  return (
    <article className="rounded-xl border border-line bg-surface-2 overflow-hidden">
      <header
        className="flex items-center gap-2 px-3 py-2.5 border-b border-line"
        style={{ backgroundColor: "#b4530918" }}
      >
        <LogoBadge operator="sabah" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Sabah 3D</h3>
        </div>
        <StatusTag status={status} />
      </header>
      <div className="grid grid-cols-3 text-center py-4 gap-2">
        <div>
          <p className="text-[10px] text-muted mb-1">1st</p>
          <PrizeNumber value={data.first} size="md" revealed={revealed} />
        </div>
        <div>
          <p className="text-[10px] text-muted mb-1">2nd</p>
          <PrizeNumber value={data.second} size="md" revealed={revealed} />
        </div>
        <div>
          <p className="text-[10px] text-muted mb-1">3rd</p>
          <PrizeNumber value={data.third} size="md" revealed={revealed} />
        </div>
      </div>
      <footer className="flex justify-between px-3 py-2 text-[10px] text-dim border-t border-line">
        <span>期号 {draw_no ?? "—"}</span>
        <span>{formatDrawDate(date)}</span>
      </footer>
    </article>
  );
}
