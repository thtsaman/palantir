"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, Suspense, Component, type ReactNode } from "react";
import type { EchelonLevel, CameraMode, ViewType } from "./EchelonBar";
import { TerrainMesh, MissionRoute } from "./terrain/TerrainMesh";
import { FormationLayer, EchelonType } from "./entities/FormationLayer";
import { CameraController } from "./camera/CameraController";

// Deterministic 3D Mountain Terrain Height Function
export function heightAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.18) * 3.5 +
    Math.cos(z * 0.14) * 2.8 +
    Math.sin((x + z) * 0.08) * 2.1
  );
}

// Topographic 2D Contour Fallback Component
function Topographic2DView({
  progress,
  echelon,
}: {
  progress: number;
  echelon: EchelonLevel;
}) {
  const w = 700;
  const h = 420;
  const markerX = 50 + progress * 600;
  const markerY = 320 - Math.sin(progress * Math.PI * 1.3) * 180;

  return (
    <div className="relative h-full w-full bg-[#080e18] flex items-center justify-center overflow-hidden">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-full w-full select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="topoGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(232,236,241,0.04)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#topoGrid)" />

        {/* Contour lines */}
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <ellipse
            key={idx}
            cx={350}
            cy={210}
            rx={80 + idx * 45}
            ry={45 + idx * 25}
            fill="none"
            stroke="rgba(85,216,245,0.1)"
            strokeWidth="1"
            strokeDasharray={idx % 2 === 0 ? "3 3" : undefined}
          />
        ))}

        {/* Vector Route Line */}
        <path
          d="M 50 320 Q 200 120 350 240 T 650 140"
          fill="none"
          stroke="#55D8F5"
          strokeWidth="2.5"
        />

        {/* Checkpoints */}
        {[
          { x: 50, y: 320, label: "START" },
          { x: 200, y: 170, label: "CP-01" },
          { x: 350, y: 240, label: "REST" },
          { x: 500, y: 190, label: "CP-02" },
          { x: 650, y: 140, label: "END" },
        ].map((cp, idx) => (
          <g key={idx} transform={`translate(${cp.x}, ${cp.y})`}>
            <circle r="5" fill="#55D8F5" />
            <circle r="9" fill="none" stroke="#55D8F5" strokeOpacity="0.4" strokeWidth="1" />
            <text
              y="-12"
              textAnchor="middle"
              fill="var(--off-white)"
              fontSize="9"
              fontFamily="var(--font-mono)"
            >
              {cp.label}
            </text>
          </g>
        ))}

        {/* Active Marker Position */}
        <g transform={`translate(${markerX}, ${markerY})`}>
          <circle r="7" fill="#F5F7FA" stroke="#55D8F5" strokeWidth="2" />
          <circle r="14" fill="none" stroke="#55D8F5" strokeOpacity="0.5" strokeWidth="1.5" />
          <text
            y="-18"
            textAnchor="middle"
            fill="var(--cyan)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            fontWeight="bold"
          >
            {echelon === "SOLDIER" ? "S-107" : echelon}
          </text>
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 mono text-[10px] text-[var(--cyan)] bg-[#09101d] px-2.5 py-1 rounded border border-[var(--border)]">
        TOPOGRAPHIC CONTOUR VIEW · SCALE: {echelon}
      </div>
    </div>
  );
}

// Error Boundary Fallback for WebGL / Three.js
class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

// 3D Scene Composition Component
function TerrainScene({
  progress,
  echelon,
  cameraMode,
  isPlaying = false,
}: {
  progress: number;
  echelon: EchelonLevel;
  cameraMode: CameraMode;
  isPlaying?: boolean;
}) {
  const waypoints = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = -60 + t * 120;
      const z = -40 + Math.sin(t * Math.PI * 1.5) * 35 + t * 20;
      const y = heightAt(x, z);
      pts.push([x, y, z]);
    }
    return pts;
  }, []);

  // Compute position & heading based on route progress
  const { currentPosition, headingAngle } = useMemo(() => {
    const total = waypoints.length - 1;
    const idx = Math.min(total - 1, Math.floor(progress * total));
    const nextIdx = Math.min(total, idx + 1);

    const curr = waypoints[idx] || [0, 0, 0];
    const next = waypoints[nextIdx] || [0, 0, 0];

    const dx = next[0] - curr[0];
    const dz = next[2] - curr[2];
    const heading = Math.atan2(dx, dz);

    return {
      currentPosition: curr,
      headingAngle: heading,
    };
  }, [waypoints, progress]);

  return (
    <>
      <color attach="background" args={["#0B1220"]} />
      <fogExp2 attach="fog" args={["#0B1220", 0.015]} />
      
      <ambientLight intensity={0.7} />
      <directionalLight position={[30, 60, 40]} intensity={1.2} castShadow />
      <directionalLight position={[-30, 20, -30]} intensity={0.4} />

      {/* Terrain Surface */}
      <TerrainMesh getTerrainHeight={heightAt} />

      {/* 3D Tactical Vector Route Line */}
      <MissionRoute waypoints={waypoints} />

      {/* Dynamic 3D Human Soldier Formation Layer */}
      <FormationLayer
        centerPosition={currentPosition}
        headingAngle={headingAngle}
        echelon={echelon as EchelonType}
        isMoving={isPlaying}
        getTerrainHeight={heightAt}
      />

      {/* Damped Camera Controller */}
      <CameraController targetPosition={currentPosition} cameraMode={cameraMode} />
    </>
  );
}

interface MissionTerrainProps {
  progress: number;
  echelon?: EchelonLevel;
  cameraMode?: CameraMode;
  viewType?: ViewType;
  isPlaying?: boolean;
  className?: string;
}

export function MissionTerrain({
  progress,
  echelon = "SOLDIER",
  cameraMode = "OVERVIEW",
  viewType = "3D",
  isPlaying = false,
  className = "h-full w-full min-h-[360px]",
}: MissionTerrainProps) {
  const p = Math.min(1, Math.max(0, progress));

  if (viewType === "TOPOGRAPHIC") {
    return (
      <div className={className}>
        <Topographic2DView progress={p} echelon={echelon} />
      </div>
    );
  }

  return (
    <div className={className}>
      <ErrorBoundary fallback={<Topographic2DView progress={p} echelon={echelon} />}>
        <Suspense fallback={<Topographic2DView progress={p} echelon={echelon} />}>
          <Canvas
            camera={{ position: [20, 20, 30], fov: 45 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: false }}
          >
            <TerrainScene
              progress={p}
              echelon={echelon}
              cameraMode={cameraMode}
              isPlaying={isPlaying}
            />
          </Canvas>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
