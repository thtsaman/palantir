"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { SliderField } from "@/components/ui/SliderField";
import { cn, formatMinutes } from "@/lib/utils";
import { Play, Pause, RotateCcw, FastForward } from "lucide-react";

const SPEEDS = [1, 2, 4] as const;

export interface TimelineEvent {
  timeMinutes: number;
  label: string;
}

interface SimulationControlsProps {
  playing: boolean;
  speed: number;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (timeMinutes: number) => void;
  className?: string;
}

export function SimulationControls({
  playing,
  speed,
  currentTime,
  duration,
  onPlayPause,
  onReset,
  onSpeedChange,
  onSeek,
  className = "",
}: SimulationControlsProps) {
  const clampedTime = Math.min(duration, Math.max(0, currentTime));
  const percent = duration > 0 ? Math.round((clampedTime / duration) * 100) : 0;

  const milestoneEvents: TimelineEvent[] = [
    { timeMinutes: 0, label: "START" },
    { timeMinutes: Math.round(duration * 0.25), label: "CP-01" },
    { timeMinutes: Math.round(duration * 0.5), label: "REST" },
    { timeMinutes: Math.round(duration * 0.75), label: "CP-02" },
    { timeMinutes: duration, label: "END" },
  ];

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={playing ? "secondary" : "primary"}
            onClick={onPlayPause}
            aria-label={playing ? "Pause" : "Play"}
            className="mono text-[11px] font-semibold flex items-center gap-1.5"
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            <span>{playing ? "PAUSE" : "PLAY"}</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onReset}
            aria-label="Reset"
            className="mono text-[11px] flex items-center gap-1"
          >
            <RotateCcw size={12} />
            <span>RESET</span>
          </Button>

          {/* Speed Selectors */}
          <div
            className="flex items-center gap-1 rounded bg-[#060b13] p-0.5 border border-[var(--border)]"
            role="group"
            aria-label="Playback speed"
          >
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={cn(
                  "h-6 min-w-[34px] rounded px-1.5 text-[10px] mono tabular transition-colors font-medium",
                  speed === s
                    ? "bg-[var(--cyan-dim)] text-[var(--cyan)] font-semibold border border-[var(--cyan)]/40"
                    : "text-[var(--gray-500)] hover:text-[var(--white)]"
                )}
                aria-pressed={speed === s}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Time Display */}
        <div className="mono tabular text-[14px] font-semibold text-[var(--white)] flex items-center gap-2">
          <span className="text-[var(--cyan)]">{formatMinutes(clampedTime)}</span>
          <span className="text-[var(--gray-500)]">/</span>
          <span className="text-[var(--gray-300)]">{formatMinutes(duration)}</span>
          <span className="text-[10px] text-[var(--gray-500)] ml-1">({percent}%)</span>
        </div>
      </div>

      {/* Milestone Timeline Track */}
      <div className="space-y-1">
        <div className="relative h-6 w-full flex items-center select-none">
          {milestoneEvents.map((ev, idx) => {
            const evPercent = duration > 0 ? (ev.timeMinutes / duration) * 100 : 0;
            const isReached = clampedTime >= ev.timeMinutes;

            return (
              <button
                key={idx}
                onClick={() => onSeek(ev.timeMinutes)}
                style={{ left: `${evPercent}%` }}
                className="absolute -translate-x-1/2 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border transition-all duration-150",
                    isReached
                      ? "bg-[var(--cyan)] border-[var(--cyan)] shadow-[0_0_6px_rgba(85,216,245,0.6)]"
                      : "bg-[#0B1220] border-[var(--gray-500)] group-hover:border-[var(--cyan)]"
                  )}
                />
                <span className="mono text-[8px] uppercase tracking-wider text-[var(--gray-500)] group-hover:text-[var(--cyan)] mt-0.5 font-medium">
                  {ev.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrub Slider */}
        <SliderField
          label="Mission Timeline"
          value={clampedTime}
          min={0}
          max={Math.max(1, duration)}
          step={1}
          onChange={onSeek}
          formatValue={(v) => formatMinutes(v)}
        />
      </div>
    </div>
  );
}
