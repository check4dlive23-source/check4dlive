"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimelinePoint } from "@/types/number-intelligence";

interface AppearanceTimelineProps {
  data: TimelinePoint[];
}

export function AppearanceTimeline({ data }: AppearanceTimelineProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.month.slice(2).replace("-", "/"),
  }));

  return (
    <div className="h-64 w-full min-h-[256px]">
      <ResponsiveContainer width="100%" height={256} minWidth={0}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6a6a90", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#6a6a90", fontSize: 10 }}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "#1c1c2a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#eeeef5",
            }}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.month ?? ""
            }
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#f5c842"
            strokeWidth={2}
            dot={{ fill: "#f5c842", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
