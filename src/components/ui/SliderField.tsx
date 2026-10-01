"use client";

import { cn } from "@/lib/utils";

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) {
  const display = formatValue ? formatValue(value) : `${value}${unit ? ` ${unit}` : ""}`;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label className="label-xs">{label}</label>
        <span className="mono tabular text-[13px] text-[var(--cyan)]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "w-full appearance-none bg-transparent accent-[var(--cyan)]",
          "[&::-webkit-slider-runnable-track]:h-[2px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[var(--gray-700)]",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--cyan)]",
          "[&::-moz-range-track]:h-[2px] [&::-moz-range-track]:bg-[var(--gray-700)]",
          "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--cyan)]"
        )}
        aria-label={label}
      />
      <div className="flex justify-between text-[10px] text-[var(--gray-500)] mono">
        <span>
          {formatValue ? formatValue(min) : `${min}${unit ? ` ${unit}` : ""}`}
        </span>
        <span>
          {formatValue ? formatValue(max) : `${max}${unit ? ` ${unit}` : ""}`}
        </span>
      </div>
    </div>
  );
}
