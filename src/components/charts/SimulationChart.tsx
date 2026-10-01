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
  { key: "fatigue", label: "Fatigue", stroke: "#55D8F5", dash: undefined, opacity: 1, width: 2 },
  { key: "mobility", label: "Mobility", stroke: "#9AA3B2", dash: "4 3", opacity: 0.95, width: 1.5 },
  { key: "endurance", label: "Endurance", stroke: "#D1D7E0", dash: "2 3", opacity: 0.85, width: 1.5 },
  {
    key: "performance",
    label: "Performance",
    stroke: "#F5F7FA",
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
  events,
}: {
  data: PerformancePoint[];
  height?: number;
  showLegend?: boolean;
  /** Mission-time cursor (minutes) drawn as a vertical reference. */
  currentTime?: number;
  /** Mission milestone markers */
  events?: EventMarker[];
}) {
  const maxTime = data.length > 0 ? Math.max(...data.map((d) => d.timeMinutes)) : 480;

  const defaultEvents: EventMarker[] = events ?? [
    { timeMinutes: 0, label: "START" },
    { timeMinutes: Math.round(maxTime * 0.25), label: "TERRAIN CHANGE" },
    { timeMinutes: Math.round(maxTime * 0.5), label: "MIDPOINT / REST" },
    { timeMinutes: Math.round(maxTime * 0.75), label: "PEAK EFFORT" },
    { timeMinutes: maxTime, label: "END" },
  ];

  return (
    <div className="w-full">
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
          <LineChart data={data} margin={{ top: 12, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(232,236,241,0.06)" vertical={false} />
            <XAxis
              dataKey="timeMinutes"
              tickFormatter={(v) => formatMinutes(Number(v))}
              stroke="#6B7380"
              tick={{ fill: "#9AA3B2", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "rgba(232,236,241,0.14)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#6B7380"
              tick={{ fill: "#6B7380", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              width={36}
              label={{
                value: "Relative Simulated Index",
                angle: -90,
                position: "insideLeft",
                fill: "#6B7380",
                fontSize: 10,
                offset: 15,
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="rounded-md border border-[var(--border-strong)] bg-[#0c1424] p-3 text-[12px] shadow-xl space-y-1.5 min-w-[170px]">
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
                stroke="#55D8F5"
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
                  fill: "rgba(154, 163, 178, 0.8)",
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
                activeDot={{ r: 4, stroke: s.stroke, strokeWidth: 2, fill: "#0B1220" }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
