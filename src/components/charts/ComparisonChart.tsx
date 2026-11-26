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
import { StatusBadge } from "@/components/ui/primitives";

export function ComparisonChart({
  baseline,
  modified,
  baselineStrength,
  modifiedStrength,
  metric = "performance",
  height = 240,
}: {
  baseline: PerformancePoint[];
  modified: PerformancePoint[];
  baselineStrength?: number[];
  modifiedStrength?: number[];
  metric?: "fatigue" | "mobility" | "endurance" | "performance" | "strength";
  height?: number;
}) {
  const times = [...new Set([...baseline, ...modified].map((point) => point.timeMinutes))].sort((a, b) => a - b);
  const atTime = (points: PerformancePoint[], strength: number[] | undefined, time: number) => {
    if (!points.length || time > points.at(-1)!.timeMinutes) return null;
    const rightIndex = points.findIndex((point) => point.timeMinutes >= time);
    if (rightIndex <= 0) return metric === "strength" ? strength?.[0] ?? null : points[0]?.[metric] ?? null;
    const left = points[rightIndex - 1]!; const right = points[rightIndex]!;
    const leftValue = metric === "strength" ? strength?.[rightIndex - 1] : left[metric];
    const rightValue = metric === "strength" ? strength?.[rightIndex] : right[metric];
    if (leftValue == null || rightValue == null) return null;
    const fraction = (time - left.timeMinutes) / (right.timeMinutes - left.timeMinutes || 1);
    return leftValue + (rightValue - leftValue) * fraction;
  };
  const data = times.map((timeMinutes) => ({ timeMinutes, baseline: atTime(baseline, baselineStrength, timeMinutes), modified: atTime(modified, modifiedStrength, timeMinutes) }));
  const len = data.length;

  if (!len) return <div className="panel flex items-center justify-center p-6 text-[12px] text-[var(--gray-500)]" style={{ minHeight: height }}>No comparison timeline is available.</div>;

  return (
    <div className="w-full" role="img" aria-label={`${metric} comparison over mission time, relative index from 0 to 100.`}>
      <div className="mb-2 flex items-center justify-between"><div className="flex gap-4 text-[11px]"><span className="inline-flex items-center gap-2 text-[var(--gray-300)]"><i className="h-0.5 w-5 border-t border-dashed border-[var(--gray-300)]"/>Baseline</span><span className="inline-flex items-center gap-2 text-[var(--cyan)]"><i className="h-0.5 w-5 bg-[var(--cyan)]"/>Alternative</span></div><StatusBadge>{metric === "strength" ? "RELATIVE INDEX" : "0–100 INDEX"}</StatusBadge></div>
      <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(201,218,221,0.075)" vertical={false} />
          <XAxis
            dataKey="timeMinutes"
            tickFormatter={(v) => formatMinutes(Number(v))}
            stroke="#718188"
            tick={{ fill: "#718188", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "rgba(201,218,221,0.14)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#718188"
            tick={{ fill: "#718188", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            labelFormatter={(value) => `Time ${formatMinutes(Number(value))}`}
            formatter={(value, name) => [`${Math.round(Number(value))} / 100`, name === "modified" ? "Alternative" : "Baseline"]}
            contentStyle={{ background: "#101821", border: "1px solid rgba(201,218,221,0.16)", borderRadius: 8, fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Baseline"
            stroke="#9AA9AD"
            strokeWidth={1.4}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="modified"
            name="Modified"
            stroke="#66D4DD"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
