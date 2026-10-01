"use client";

import React from "react";

interface MissionRoutePreviewProps {
  scenarioName?: string;
  altitudeMeters?: number;
  distanceKm?: number;
  className?: string;
}

export function MissionRoutePreview({
  scenarioName = "High Altitude Patrol",
  altitudeMeters = 3500,
  distanceKm = 12,
  className = "",
}: MissionRoutePreviewProps) {
  return (
    <div className={`relative w-full rounded-lg border border-[var(--border)] bg-[#0c1424] p-3.5 overflow-hidden ${className}`}>
      {/* Visual Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--cyan)] animate-pulse" />
          <span className="mono text-[11px] font-medium tracking-wider text-[var(--gray-300)] uppercase">
            TERRAIN & ROUTE SIMULATION
          </span>
        </div>
        <div className="mono text-[10px] text-[var(--cyan)]/80">
          ALT {altitudeMeters}M · DIST {distanceKm}KM
        </div>
      </div>

      {/* SVG Terrain & Contour Canvas */}
      <div className="relative h-[120px] w-full overflow-hidden rounded bg-[var(--ink)]/80 border border-[var(--border)]/60">
        <svg
          viewBox="0 0 400 120"
          className="h-full w-full select-none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(232,236,241,0.04)"
                strokeWidth="1"
              />
            </pattern>
            {/* Cyan Path Gradient */}
            <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#55D8F5" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#55D8F5" stopOpacity="1" />
              <stop offset="100%" stopColor="#55D8F5" stopOpacity="0.6" />
            </linearGradient>
            {/* Area Fill */}
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#55D8F5" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#55D8F5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Background */}
          <rect width="400" height="120" fill="url(#grid)" />

          {/* Topographic Contour Lines */}
          <path
            d="M 0 100 Q 60 70 120 85 T 240 60 T 360 90 T 400 75"
            fill="none"
            stroke="rgba(232, 236, 241, 0.06)"
            strokeWidth="1"
          />
          <path
            d="M 0 80 Q 80 50 160 65 T 280 40 T 400 65"
            fill="none"
            stroke="rgba(232, 236, 241, 0.08)"
            strokeWidth="1"
          />
          <path
            d="M 0 60 Q 100 30 200 45 T 320 20 T 400 45"
            fill="none"
            stroke="rgba(232, 236, 241, 0.05)"
            strokeWidth="1"
          />

          {/* Elevation Area Fill */}
          <path
            d="M 0 95 L 40 85 L 90 60 L 150 75 L 220 35 L 290 55 L 350 40 L 400 65 L 400 120 L 0 120 Z"
            fill="url(#areaGrad)"
          />

          {/* Mission Route Vector Path */}
          <path
            d="M 20 95 L 60 85 L 110 62 L 170 75 L 230 38 L 300 55 L 370 42"
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Checkpoint Markers */}
          {[
            { x: 20, y: 95, label: "START", active: true },
            { x: 110, y: 62, label: "CP-1", active: true },
            { x: 230, y: 38, label: "MIDPOINT", active: true },
            { x: 370, y: 42, label: "END", active: false },
          ].map((cp, idx) => (
            <g key={idx} transform={`translate(${cp.x}, ${cp.y})`}>
              <circle
                r="4"
                fill={cp.active ? "#55D8F5" : "#0B1220"}
                stroke="#55D8F5"
                strokeWidth="1.5"
              />
              <circle r="8" fill="none" stroke="#55D8F5" strokeOpacity="0.3" strokeWidth="1" />
              <text
                y="-10"
                textAnchor="middle"
                fill="var(--off-white)"
                fontSize="8"
                fontFamily="var(--font-mono)"
                className="select-none font-semibold"
              >
                {cp.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Current Position Overlay Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-[var(--ink)]/90 px-2 py-0.5 border border-[var(--border)] text-[9px] text-[var(--gray-300)] mono">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)]" />
          PATROL ROUTE ALPHA · MOUNTAIN PASS
        </div>
      </div>
    </div>
  );
}
