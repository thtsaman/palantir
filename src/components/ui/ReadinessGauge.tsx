"use client";

import React from "react";

interface ReadinessGaugeProps {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  type?: "ring" | "semi";
}

export function ReadinessGauge({
  value,
  max = 100,
  size = 180,
  label = "SIMULATED INDEX",
  sublabel,
  className = "",
  type = "ring",
}: ReadinessGaugeProps) {
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = normalizedValue / max;
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;

  if (type === "semi") {
    // Semi-circle gauge (180 degrees)
    const circumference = Math.PI * radius;
    const strokeDashoffset = circumference * (1 - percentage);

    return (
      <div className={`relative flex flex-col items-center justify-center ${className}`}>
        <svg
          width={size}
          height={size / 2 + strokeWidth + 10}
          viewBox={`0 0 ${size} ${size / 2 + strokeWidth + 10}`}
          className="overflow-visible"
        >
          {/* Track background */}
          <path
            d={`M ${strokeWidth},${center} A ${radius},${radius} 0 0,1 ${size - strokeWidth},${center}`}
            fill="none"
            stroke="rgba(232, 236, 241, 0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={`M ${strokeWidth},${center} A ${radius},${radius} 0 0,1 ${size - strokeWidth},${center}`}
            fill="none"
            stroke="#55D8F5"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const angle = Math.PI * (1 - ratio);
            const x1 = center + (radius - 12) * Math.cos(angle);
            const y1 = center - (radius - 12) * Math.sin(angle);
            const x2 = center + (radius - 6) * Math.cos(angle);
            const y2 = center - (radius - 6) * Math.sin(angle);
            return (
              <line
                key={ratio}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(232, 236, 241, 0.2)"
                strokeWidth={1.5}
              />
            );
          })}
        </svg>

        <div className="absolute bottom-1 flex flex-col items-center text-center">
          <div className="mono tabular text-4xl font-semibold tracking-tight text-[var(--cyan)]">
            {Math.round(normalizedValue)}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--gray-500)] font-medium">
            {label}
          </div>
          {sublabel && (
            <div className="text-[11px] text-[var(--gray-300)] mt-0.5">{sublabel}</div>
          )}
        </div>
      </div>
    );
  }

  // Full circular ring gauge
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg] overflow-visible"
      >
        {/* Track background */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(232, 236, 241, 0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Value circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#55D8F5"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="mono tabular text-4xl font-semibold tracking-tight text-[var(--white)]">
          {Math.round(normalizedValue)}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-widest text-[var(--cyan)] font-mono">
          {label}
        </div>
        {sublabel && (
          <div className="text-[11px] text-[var(--gray-500)] mt-0.5">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
