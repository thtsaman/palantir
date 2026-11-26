"use client";

import { Canvas } from "@react-three/fiber";
import { useCallback, useMemo, Suspense, Component, type ReactNode } from "react";
import type { EchelonLevel, CameraMode, ViewType } from "./EchelonBar";
import { TerrainMesh, MissionRoute } from "./terrain/TerrainMesh";
import { FormationLayer } from "./entities/FormationLayer";
import { CameraController } from "./camera/CameraController";
import type { TerrainType } from "@/lib/simulation/types";
import { terrainProfile } from "./terrain/profiles";

// Deterministic 3D Mountain Terrain Height Function
export function heightAt(x: number, z: number, terrainType: TerrainType = "MOUNTAIN"): number {
  const profile = terrainProfile(terrainType);
  const amplitude = profile.amplitude;
  const biome = terrainType === "DESERT" ? Math.sin(x * 0.045 + Math.sin(z * 0.02) * 2) * 5 : terrainType === "FOREST" ? Math.sin(x * 0.1) * 2 + Math.cos(z * 0.08) * 2 : 0;
  return biome + amplitude * (
    Math.sin(x * 0.18) * 3.5 +
    Math.cos(z * 0.14) * 2.8 +
    Math.sin((x + z) * 0.08) * 2.1
  );
}

// Topographic 2D Contour Fallback Component
function Topographic2DView({
  progress,
  echelon,
  terrainType,
  distanceKm,
}: {
  progress: number;
  echelon: EchelonLevel;
  terrainType: TerrainType;
  distanceKm: number;
}) {
  const w = 700;
  const h = 420;
  const markerX = 50 + progress * 600;
    const terrainAmplitude = terrainProfile(terrainType).amplitude * 100;
  const markerY = 320 - Math.sin(progress * Math.PI * 1.3) * terrainAmplitude;

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
        <rect width={w} height={h} fill={terrainProfile(terrainType).color} opacity="0.16" />
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
            stroke={terrainProfile(terrainType).accent}
            strokeOpacity="0.2"
            strokeWidth="1"
            strokeDasharray={idx % 2 === 0 ? "3 3" : undefined}
          />
        ))}

        {/* Vector Route Line */}
        <path
          d={`M 50 320 Q 200 ${320 - terrainAmplitude} 350 ${320 - terrainAmplitude * 0.45} T 650 ${320 - terrainAmplitude * 0.9}`}
          fill="none"
          stroke={terrainType === "DESERT" ? "#e7bd79" : terrainType === "FOREST" ? "#70b883" : "#55D8F5"}
          strokeWidth="2.5"
        />

        {/* Checkpoints */}
        {[
          { x: 50, y: 320, label: "START" },
          { x: 200, y: 320 - terrainAmplitude * 0.8, label: "CP-01" },
          { x: 350, y: 320 - terrainAmplitude * 0.45, label: "MIDPOINT" },
          { x: 500, y: 320 - terrainAmplitude * 0.7, label: "CP-02" },
          { x: 650, y: 320 - terrainAmplitude * 0.9, label: "END" },
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
            {echelon}
          </text>
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 mono text-[10px] text-[var(--cyan)] bg-[#09101d] px-2.5 py-1 rounded border border-[var(--border)]">
        SCHEMATIC {terrainType.replaceAll("_", " ")} · {distanceKm} KM · SCALE: {echelon} · NOT GEOGRAPHIC DATA
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
  cameraMode,
  isPlaying = false,
  roster = [],
  onSelectSoldier,
  selectedSoldierId,
  terrainType,
  distanceKm,
}: {
  progress: number;
  cameraMode: CameraMode;
  isPlaying?: boolean;
  roster?: Array<{ id: string; soldierCode: string }>;
  onSelectSoldier?: (id: string) => void;
  selectedSoldierId?: string | null;
  terrainType: TerrainType;
  distanceKm: number;
}) {
  const terrainHeight = useCallback((x: number, z: number) => heightAt(x, z, terrainType), [terrainType]);
  const waypoints = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const distanceScale = Math.max(0.45, Math.min(1.5, distanceKm / 12));
      const x = (-60 + t * 120) * distanceScale;
      const z = (-40 + Math.sin(t * Math.PI * 1.5) * 35 + t * 20) * distanceScale;
      const y = heightAt(x, z, terrainType);
      pts.push([x, y, z]);
    }
    return pts;
  }, [distanceKm, terrainType]);

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
        <TerrainMesh getTerrainHeight={terrainHeight} terrainType={terrainType} />

      {/* 3D Tactical Vector Route Line */}
      <MissionRoute waypoints={waypoints} />

      {/* Dynamic 3D Human Soldier Formation Layer */}
      <FormationLayer
        centerPosition={currentPosition}
        headingAngle={headingAngle}
        isMoving={isPlaying}
        getTerrainHeight={terrainHeight}
        roster={roster}
        onSelectSoldier={onSelectSoldier}
        selectedSoldierId={selectedSoldierId}
      />

      {/* Damped Camera Controller */}
      <CameraController targetPosition={currentPosition} cameraMode={cameraMode} />
    </>
  );
}

interface MissionTerrainProps {
  progress: number;
  terrainType: TerrainType;
  distanceKm: number;
  altitudeMeters: number;
  echelon?: EchelonLevel;
  cameraMode?: CameraMode;
  viewType?: ViewType;
  isPlaying?: boolean;
  roster?: Array<{ id: string; soldierCode: string }>;
  onSelectSoldier?: (id: string) => void;
  selectedSoldierId?: string | null;
  className?: string;
}

export function MissionTerrain({
  progress,
  terrainType,
  distanceKm,
  altitudeMeters,
  echelon = "SOLDIER",
  cameraMode = "OVERVIEW",
  viewType = "3D",
  isPlaying = false,
  roster = [],
  onSelectSoldier,
  selectedSoldierId,
  className = "h-full w-full min-h-[360px]",
}: MissionTerrainProps) {
  const p = Math.min(1, Math.max(0, progress));

  if (viewType === "TOPOGRAPHIC") {
    return (
      <div className={className}>
        <Topographic2DView progress={p} echelon={echelon} terrainType={terrainType} distanceKm={distanceKm} />
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <ErrorBoundary fallback={<Topographic2DView progress={p} echelon={echelon} terrainType={terrainType} distanceKm={distanceKm} />}>
        <Suspense fallback={<Topographic2DView progress={p} echelon={echelon} terrainType={terrainType} distanceKm={distanceKm} />}>
          <Canvas
            camera={{ position: [20, 20, 30], fov: 45 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: false }}
          >
            <TerrainScene
              progress={p}
              cameraMode={cameraMode}
              isPlaying={isPlaying}
              roster={roster}
              terrainType={terrainType}
              distanceKm={distanceKm}
              onSelectSoldier={onSelectSoldier}
              selectedSoldierId={selectedSoldierId}
            />
          </Canvas>
        </Suspense>
      </ErrorBoundary>
      <div className="pointer-events-none absolute left-3 top-3 rounded border border-[var(--border)] bg-[#09101d]/90 px-2 py-1 text-[9px] mono text-[var(--gray-300)]">SYNTHETIC {terrainType.replaceAll("_", " ")} TERRAIN · {altitudeMeters} M INPUT · {distanceKm} KM ROUTE · NOT GEOGRAPHIC DATA</div>
    </div>
  );
}
