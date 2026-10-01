"use client";

import React from "react";

interface BaselineRadarChartProps {
  mobility: number;
  endurance: number;
  strength: number;
  recovery: number;
  compositeIndex: number;
  size?: number;
  className?: string;
}

export function BaselineRadarChart({
  mobility,
  endurance,
  strength,
  recovery,
  compositeIndex,
  size = 240,
  className = "",
}: BaselineRadarChartProps) {
  const center = size / 2;
  const maxRadius = center - 36;

  // 4 axes angles: Top (Endurance), Right (Strength), Bottom (Recovery), Left (Mobility)
  // Axes Ratios (0..1)
  const rMobility = Math.min(100, Math.max(0, mobility)) / 100;
  const rEndurance = Math.min(100, Math.max(0, endurance)) / 100;
  const rStrength = Math.min(100, Math.max(0, strength)) / 100;
  const rRecovery = Math.min(100, Math.max(0, recovery)) / 100;

  // Coordinates helper (angle 0 = Top: Endurance, 90 = Right: Strength, 180 = Bottom: Recovery, 270 = Left: Mobility)
  const getPoint = (valRatio: number, angleDeg: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    const r = valRatio * maxRadius;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  // Grid concentric rings (25%, 50%, 75%, 100%)
  const gridRings = [0.25, 0.5, 0.75, 1.0];

  // Polygon points: Top (Endurance), Right (Strength), Bottom (Recovery), Left (Mobility)
  const ptEndurance = getPoint(rEndurance, 0);
  const ptStrength = getPoint(rStrength, 90);
  const ptRecovery = getPoint(rRecovery, 180);
  const ptMobility = getPoint(rMobility, 270);

  const polyPath = `${ptEndurance.x},${ptEndurance.y} ${ptStrength.x},${ptStrength.y} ${ptRecovery.x},${ptRecovery.y} ${ptMobility.x},${ptMobility.y}`;

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="select-none overflow-visible"
        aria-label="Baseline capability polygon"
      >
        {/* Concentric Grid Polygons */}
        {gridRings.map((r, idx) => {
          const pTop = getPoint(r, 0);
          const pRight = getPoint(r, 90);
          const pBot = getPoint(r, 180);
          const pLeft = getPoint(r, 270);
          return (
            <polygon
              key={idx}
              points={`${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBot.x},${pBot.y} ${pLeft.x},${pLeft.y}`}
              fill="none"
              stroke="rgba(232, 236, 241, 0.08)"
              strokeWidth="1"
              strokeDasharray={idx < 3 ? "2 2" : undefined}
            />
          );
        })}

        {/* Axis Cross Lines */}
        <line
          x1={center}
          y1={center - maxRadius}
          x2={center}
          y2={center + maxRadius}
          stroke="rgba(232, 236, 241, 0.12)"
          strokeWidth="1"
        />
        <line
          x1={center - maxRadius}
          y1={center}
          x2={center + maxRadius}
          y2={center}
          stroke="rgba(232, 236, 241, 0.12)"
          strokeWidth="1"
        />

        {/* Radar Value Area Polygon */}
        <polygon
          points={polyPath}
          fill="rgba(85, 216, 245, 0.14)"
          stroke="#55D8F5"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Value Vertex Nodes */}
        {[
          { pt: ptEndurance, val: endurance, label: "ENDURANCE" },
          { pt: ptStrength, val: strength, label: "STRENGTH" },
          { pt: ptRecovery, val: recovery, label: "RECOVERY" },
          { pt: ptMobility, val: mobility, label: "MOBILITY" },
        ].map((node, i) => (
          <circle
            key={i}
            cx={node.pt.x}
            cy={node.pt.y}
            r="3.5"
            fill="#55D8F5"
            stroke="#0B1220"
            strokeWidth="1.5"
          />
        ))}

        {/* Axis Labels */}
        {/* Top: Endurance */}
        <text
          x={center}
          y={center - maxRadius - 10}
          textAnchor="middle"
          fill="var(--off-white)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fontWeight="600"
        >
          ENDURANCE <tspan fill="#55D8F5">{endurance}</tspan>
        </text>

        {/* Right: Strength */}
        <text
          x={center + maxRadius + 10}
          y={center + 4}
          textAnchor="start"
          fill="var(--off-white)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fontWeight="600"
        >
          STR <tspan fill="#55D8F5">{strength}</tspan>
        </text>

        {/* Bottom: Recovery */}
        <text
          x={center}
          y={center + maxRadius + 18}
          textAnchor="middle"
          fill="var(--off-white)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fontWeight="600"
        >
          RECOVERY <tspan fill="#55D8F5">{recovery}</tspan>
        </text>

        {/* Left: Mobility */}
        <text
          x={center - maxRadius - 10}
          y={center + 4}
          textAnchor="end"
          fill="var(--off-white)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fontWeight="600"
        >
          MOB <tspan fill="#55D8F5">{mobility}</tspan>
        </text>
      </svg>

      {/* Central Composite Label */}
      <div className="mt-1 text-center">
        <div className="mono tabular text-3xl font-bold tracking-tight text-[var(--cyan)]">
          {compositeIndex}
        </div>
        <div className="text-[10px] uppercase font-mono tracking-widest text-[var(--gray-500)] mt-0.5">
          COMPOSITE BASELINE INDEX
        </div>
      </div>
    </div>
  );
}
