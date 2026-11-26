"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { PerformancePoint } from "@/lib/simulation/types";
import { formatMinutes } from "@/lib/utils";

const SERIES = [
  { key: "fatigue", label: "Fatigue index", stroke: "#E9B96C", dash: undefined, opacity: 1, width: 1.9 },
  { key: "mobility", label: "Mobility index", stroke: "#66D4DD", dash: "5 3", opacity: 0.95, width: 1.7 },
  { key: "endurance", label: "Endurance index", stroke: "#9CAFC2", dash: "2 3", opacity: 0.9, width: 1.7 },
  {
    key: "performance",
    label: "Performance index",
    stroke: "#73C99B",
    dash: undefined,
    opacity: 1,
    width: 2.2,
  },
] as const;

export interface EventMarker {
  timeMinutes: number;
  label: string;
}

export function SimulationChart({
  data,
  height = 300,
  showLegend = true,
  currentTime,
  visibleThroughTime,
  events,
}: {
  data: PerformancePoint[];
  height?: number;
  showLegend?: boolean;
  /** Mission-time cursor (minutes) drawn as a vertical reference. */
  currentTime?: number;
  /** When supplied, only the trajectory through the current playback checkpoint is drawn. */
  visibleThroughTime?: number;
  /** Mission milestone markers */
  events?: EventMarker[];
}) {
  const maxTime = data.length > 0 ? Math.max(...data.map((d) => d.timeMinutes)) : 480;
  const visibleData = typeof visibleThroughTime === "number" ? data.filter((point) => point.timeMinutes <= visibleThroughTime) : data;
  if (typeof visibleThroughTime === "number" && visibleData.length > 0 && visibleData.at(-1)!.timeMinutes < visibleThroughTime) {
    const before = [...data].reverse().find((point) => point.timeMinutes < visibleThroughTime);
    const after = data.find((point) => point.timeMinutes > visibleThroughTime);
    if (before && after) {
      const ratio = (visibleThroughTime - before.timeMinutes) / (after.timeMinutes - before.timeMinutes);
      const interpolate = (key: "fatigue" | "mobility" | "endurance" | "performance") => before[key] + (after[key] - before[key]) * ratio;
      visibleData.push({ timeMinutes: visibleThroughTime, fatigue: interpolate("fatigue"), mobility: interpolate("mobility"), endurance: interpolate("endurance"), performance: interpolate("performance") });
    }
  }

  const defaultEvents: EventMarker[] = events ?? [];

  if (data.length === 0) return <div className="panel flex items-center justify-center p-8 text-[13px] text-[var(--gray-500)]" style={{ minHeight: height }}>No saved time-series data for this run.</div>;

  return (
    <div className="w-full" role="img" aria-label={`Simulation timeline, mission time in minutes, relative model indices from 0 to 100. ${data.length} saved data points.`}>
      {showLegend ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--gray-300)] border-b border-[var(--border)]/60 pb-3">
          <div className="flex flex-wrap gap-4">
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  className="inline-block h-[2.5px] w-5 rounded-full"
                  style={{
                    background: s.stroke,
                    opacity: s.opacity,
                    borderTop: s.dash ? `2px dashed ${s.stroke}` : undefined,
                    backgroundColor: s.dash ? "transparent" : s.stroke,
                  }}
                />
                <span className="mono font-medium text-[var(--off-white)]">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="mono text-[10px] text-[var(--gray-500)]">
            TIMELINE: 0h → {Math.round(maxTime / 60)}h
          </div>
        </div>
      ) : null}

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <LineChart data={visibleData} margin={{ top: 12, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(201,218,221,0.075)" vertical={false} />
            <XAxis
              dataKey="timeMinutes"
              type="number"
              domain={[0, maxTime]}
              tickFormatter={(v) => formatMinutes(Number(v))}
              stroke="#718188"
              tick={{ fill: "#9AA9AD", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "rgba(201,218,221,0.17)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#718188"
              tick={{ fill: "#718188", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              width={36}
              label={{
                value: "Relative index (0–100)",
                angle: -90,
                position: "insideLeft",
                fill: "#718188",
                fontSize: 10,
                offset: 15,
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="rounded-lg border border-[var(--border-strong)] bg-[#101821] p-3 text-[12px] shadow-xl space-y-1.5 min-w-[180px]">
                    <div className="mono text-[11px] font-semibold text-[var(--cyan)] border-b border-[var(--border)] pb-1">
                      Time: {formatMinutes(Number(label))}
                    </div>
                    <div className="space-y-1 pt-0.5">
                      {payload.map((p, idx) => (
                        <div key={String(p.dataKey ?? idx)} className="flex justify-between items-center text-[11px]">
                          <span className="text-[var(--gray-300)]">{p.name}:</span>
                          <span className="mono tabular font-semibold text-[var(--white)]">
                            {Math.round(Number(p.value))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />

            {/* Current Time Cursor */}
            {typeof currentTime === "number" ? (
              <ReferenceLine
                x={currentTime}
                stroke="#66D4DD"
                strokeOpacity={0.8}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            ) : null}

            {/* Event Markers */}
            {defaultEvents.map((ev, idx) => (
              <ReferenceLine
                key={idx}
                x={ev.timeMinutes}
                stroke="rgba(232, 236, 241, 0.18)"
                strokeDasharray="2 2"
                label={{
                  value: ev.label,
                  position: "top",
                  fill: "rgba(154, 169, 173, 0.8)",
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                }}
              />
            ))}

            {/* Data Lines */}
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.stroke}
                strokeOpacity={s.opacity}
                strokeWidth={s.width}
                strokeDasharray={s.dash}
                dot={false}
                activeDot={{ r: 4, stroke: s.stroke, strokeWidth: 2, fill: "#0a0f15" }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
