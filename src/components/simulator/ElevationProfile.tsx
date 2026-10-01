"use client";

import React from "react";

interface ElevationProfileProps {
  progress: number; // 0..1
  altitudeMeters?: number;
  className?: string;
}

export function ElevationProfile({
  progress,
  altitudeMeters = 3500,
  className = "",
}: ElevationProfileProps) {
  const p = Math.min(1, Math.max(0, progress));

  // Elevation profile data points (distance % vs relative elevation height)
  const profilePoints = [
    { x: 0, y: 35 },
    { x: 15, y: 48 },
    { x: 30, y: 28 },
    { x: 50, y: 72 },
    { x: 70, y: 55 },
    { x: 85, y: 85 },
    { x: 100, y: 40 },
  ];

  const w = 320;
  const h = 50;

  // Generate SVG path string
  const svgPoints = profilePoints
    .map((pt) => {
      const px = (pt.x / 100) * w;
      const py = h - (pt.y / 100) * (h - 10);
      return `${px},${py}`;
    })
    .join(" ");

  // Interpolate marker position
  const markerX = p * w;
  // Sample Y along SVG points
  const idx = Math.min(
    profilePoints.length - 1,
    Math.floor(p * (profilePoints.length - 1))
  );
  const curPt = profilePoints[idx] ?? profilePoints[0]!;
  const markerY = h - (curPt.y / 100) * (h - 10);

  return (
    <div className={`relative w-full rounded bg-[#070d18] border border-[var(--border)] p-2 select-none ${className}`}>
      <div className="flex items-center justify-between text-[9px] mono text-[var(--gray-500)] mb-1">
        <span className="text-[var(--cyan)] font-semibold uppercase">ELEVATION PROFILE</span>
        <span>PEAK {altitudeMeters}M</span>
      </div>

      <div className="relative h-[50px] w-full">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#55D8F5" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#55D8F5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <polygon
            points={`0,${h} ${svgPoints} ${w},${h}`}
            fill="url(#elevGrad)"
          />

          {/* Line Profile */}
          <polyline
            points={svgPoints}
            fill="none"
            stroke="rgba(85,216,245,0.7)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Current Marker Cursor */}
          <line
            x1={markerX}
            y1={0}
            x2={markerX}
            y2={h}
            stroke="#55D8F5"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <circle cx={markerX} cy={markerY} r="3" fill="#55D8F5" stroke="#0B1220" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
