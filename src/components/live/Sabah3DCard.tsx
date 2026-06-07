"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
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
    <article className="subpage-card overflow-hidden">
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
          <span
            className={`font-mono font-bold font-number text-3xl tracking-wide ${
              revealed ? "text-foreground" : "text-muted opacity-70"
            }`}
          >
            {revealed ? data.first : "----"}
          </span>
        </div>
        <div>
          <p className="text-[10px] text-muted mb-1">2nd</p>
          <span
            className={`font-mono font-bold font-number text-3xl tracking-wide ${
              revealed ? "text-foreground" : "text-muted opacity-70"
            }`}
          >
            {revealed ? data.second : "----"}
          </span>
        </div>
        <div>
          <p className="text-[10px] text-muted mb-1">3rd</p>
          <span
            className={`font-mono font-bold font-number text-3xl tracking-wide ${
              revealed ? "text-foreground" : "text-muted opacity-70"
            }`}
          >
            {revealed ? data.third : "----"}
          </span>
        </div>
      </div>
      <footer className="flex justify-between px-3 py-2 text-[10px] text-dim border-t border-line">
        <span>{formatDrawDate(date)}</span>
        <span>期号 {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
