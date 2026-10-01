"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { PerformancePoint } from "@/lib/simulation/types";
import { formatMinutes } from "@/lib/utils";

export function ComparisonChart({
  baseline,
  modified,
  metric = "performance",
  height = 240,
}: {
  baseline: PerformancePoint[];
  modified: PerformancePoint[];
  metric?: "fatigue" | "mobility" | "endurance" | "performance";
  height?: number;
}) {
  const len = Math.max(baseline.length, modified.length);
  const data = Array.from({ length: len }, (_, i) => ({
    timeMinutes: baseline[i]?.timeMinutes ?? modified[i]?.timeMinutes ?? i,
    baseline: baseline[i]?.[metric],
    modified: modified[i]?.[metric],
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(232,236,241,0.06)" vertical={false} />
          <XAxis
            dataKey="timeMinutes"
            tickFormatter={(v) => formatMinutes(Number(v))}
            stroke="#6B7380"
            tick={{ fill: "#6B7380", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "rgba(232,236,241,0.12)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#6B7380"
            tick={{ fill: "#6B7380", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid rgba(232,236,241,0.12)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Baseline"
            stroke="#9AA3B2"
            strokeWidth={1.4}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="modified"
            name="Modified"
            stroke="#55D8F5"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
