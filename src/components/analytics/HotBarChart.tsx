"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HotNumberRow } from "@/types/analytics";

export function HotBarChart({ data }: { data: HotNumberRow[] }) {
  const chartData = data.slice(0, 20).map((r) => ({
    number: r.number,
    hits: r.total_hits,
  }));

  return (
    <div className="h-64 w-full min-h-[256px]">
      <ResponsiveContainer width="100%" height={256} minWidth={0}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis dataKey="number" tick={{ fill: "#6a6a90", fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#6a6a90", fontSize: 10 }} width={28} />
          <Tooltip
            contentStyle={{
              background: "#1c1c2a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="hits" fill="#f5c842" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
