"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MissionTerrain } from "@/components/simulator/MissionTerrain";
import { SimulationControls } from "@/components/simulator/SimulationControls";
import { SimulationChart } from "@/components/charts/SimulationChart";
import { EchelonBar, type EchelonLevel, type CameraMode, type ViewType } from "@/components/simulator/EchelonBar";
import { ElevationProfile } from "@/components/simulator/ElevationProfile";
import { Button } from "@/components/ui/Button";
import {
  Panel,
  SectionHeader,
  StatValue,
  StatusBadge,
} from "@/components/ui/primitives";
import type { PerformancePoint, SoldierBaseline } from "@/lib/simulation/types";
import { terrainLabel } from "@/lib/simulation/factors";
import type { TerrainType, TimeOfDay } from "@/lib/simulation/types";
import { cn, formatMinutes } from "@/lib/utils";

export type SimulatorScenario = {
  id: string;
  name: string;
  terrainType: TerrainType;
  altitudeMeters: number;
  temperatureCelsius: number;
  loadKg: number;
  distanceKm: number;
  durationMinutes: number;
  restMinutes: number;
  timeOfDay: TimeOfDay;
  description: string | null;
  soldierId: string | null;
};

export type SimulatorSoldier = {
  id: string;
  soldierCode: string;
} & SoldierBaseline;

const UPDATE_STEP_MIN = 0.5;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sampleAt(
  snapshots: PerformancePoint[],
  t: number
): PerformancePoint {
  if (snapshots.length === 0) {
    return {
      timeMinutes: t,
      fatigue: 0,
      mobility: 0,
      endurance: 0,
      performance: 0,
    };
  }
  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;
  if (t <= first.timeMinutes) return { ...first, timeMinutes: t };
  if (t >= last.timeMinutes) return { ...last, timeMinutes: last.timeMinutes };

  let lo = 0;
  let hi = snapshots.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (snapshots[mid]!.timeMinutes <= t) lo = mid;
    else hi = mid;
  }
  const a = snapshots[lo]!;
  const b = snapshots[hi]!;
  const span = b.timeMinutes - a.timeMinutes || 1;
  const u = (t - a.timeMinutes) / span;
  const lerp = (x: number, y: number) => round1(x + (y - x) * u);
  return {
    timeMinutes: round1(t),
    fatigue: lerp(a.fatigue, b.fatigue),
    mobility: lerp(a.mobility, b.mobility),
    endurance: lerp(a.endurance, b.endurance),
    performance: lerp(a.performance, b.performance),
  };
}

export function SimulatorClient({
  scenario,
  soldier,
  snapshots,
  explanations,
  source,
}: {
  scenario: SimulatorScenario;
  soldier: SimulatorSoldier | null;
  snapshots: PerformancePoint[];
  explanations: string[];
  source: "stored" | "computed";
}) {
  const duration = Math.max(
    1,
    scenario.durationMinutes,
    snapshots[snapshots.length - 1]?.timeMinutes ?? 0
  );

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [whyOpen, setWhyOpen] = useState(true);

  // Echelon Controls State
  const [echelon, setEchelon] = useState<EchelonLevel>("SOLDIER");
  const [cameraMode, setCameraMode] = useState<CameraMode>("FOLLOW");
  const [viewType, setViewType] = useState<ViewType>("3D");
  const [isDemoMode, setIsDemoMode] = useState(false);

  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const timeRef = useRef(currentTime);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const lastCommitRef = useRef(0);

  useEffect(() => {
    playingRef.current = playing;
    speedRef.current = speed;
    timeRef.current = currentTime;
  }, [playing, speed, currentTime]);

  const commitTime = useCallback((t: number) => {
    const clamped = Math.min(duration, Math.max(0, t));
    timeRef.current = clamped;
    setCurrentTime(clamped);
    lastCommitRef.current = clamped;
  }, [duration]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      return;
    }

    const tick = (ts: number) => {
      if (!playingRef.current) return;
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dtMs = ts - lastTsRef.current;
      lastTsRef.current = ts;

      // 1× = 1 mission-minute per real second
      const next =
        timeRef.current + (dtMs / 1000) * speedRef.current;

      if (next >= duration) {
        commitTime(duration);
        setPlaying(false);
        return;
      }

      // Throttle React updates — avoid thrashing on every frame
      if (
        Math.abs(next - lastCommitRef.current) >= UPDATE_STEP_MIN ||
        next <= 0
      ) {
        commitTime(next);
      } else {
        timeRef.current = next;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [playing, duration, commitTime]);

  const metrics = useMemo(
    () => sampleAt(snapshots, currentTime),
    [snapshots, currentTime]
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  // Quantize terrain progress so Three.js doesn't update every 0.5 min tick thrash
  const terrainProgress = Math.round(progress * 40) / 40;

  const chartCursor = Math.round(currentTime);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge tone="cyan">PROTOTYPE SIMULATION</StatusBadge>
            <StatusBadge tone="muted">Relative simulated indices</StatusBadge>
            <StatusBadge tone={source === "stored" ? "cyan" : "neutral"}>
              {source === "stored" ? "Stored run" : "Live compute"}
            </StatusBadge>
            {playing ? (
              <StatusBadge tone="cyan">Playing</StatusBadge>
            ) : (
              <StatusBadge tone="muted">Paused</StatusBadge>
            )}
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--white)] leading-none">
            {scenario.name}
          </h1>
          <p className="mt-2 text-[13px] text-[var(--gray-300)]">
            {terrainLabel(scenario.terrainType)} ·{" "}
            <span className="mono tabular">{scenario.altitudeMeters} m</span> ·{" "}
            <span className="mono tabular">{scenario.temperatureCelsius}°C</span> ·{" "}
            <span className="mono tabular">{scenario.loadKg} kg</span> ·{" "}
            {scenario.timeOfDay}
            {soldier ? (
              <>
                {" "}
                · Soldier{" "}
                <span className="mono text-[var(--off-white)]">
                  {soldier.soldierCode}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button href={`/what-if?scenarioId=${scenario.id}`} variant="secondary" size="sm">
            What-If
          </Button>
          <Button href={`/missions/${scenario.id}/unit`} variant="secondary" size="sm">
            Unit view
          </Button>
          <Button href="/operations" variant="ghost" size="sm">
            Operations
          </Button>
        </div>
      </div>

      {/* Echelon Lens Controls */}
      <EchelonBar
        currentEchelon={echelon}
        onSelectEchelon={setEchelon}
        cameraMode={cameraMode}
        onSelectCameraMode={setCameraMode}
        viewType={viewType}
        onSelectViewType={setViewType}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode((d) => !d)}
        soldierCode={soldier?.soldierCode}
      />

      {/* Main stage: terrain + human state */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">
        <Panel padded={false} className="overflow-hidden !p-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <div className="label-xs">Mission Terrain</div>
            <div className="mono tabular text-[11px] text-[var(--gray-500)]">
              Progress {Math.round(progress * 100)}%
            </div>
          </div>
          <MissionTerrain
            progress={terrainProgress}
            echelon={echelon}
            cameraMode={cameraMode}
            viewType={viewType}
            isPlaying={playing}
            className="h-[min(58vh,560px)] min-h-[360px] w-full"
          />
          <div className="border-t border-[var(--border)] px-4 py-3">
            <SimulationControls
              playing={playing}
              speed={speed}
              currentTime={currentTime}
              duration={duration}
              onPlayPause={() => {
                if (currentTime >= duration) {
                  commitTime(0);
                  setPlaying(true);
                  return;
                }
                setPlaying((p) => !p);
              }}
              onReset={() => {
                setPlaying(false);
                commitTime(0);
              }}
              onSpeedChange={setSpeed}
              onSeek={(t) => {
                setPlaying(false);
                commitTime(t);
              }}
            />
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel className="!p-5 flex-1">
            <SectionHeader
              title="Human State"
              subtitle="Indices at current mission time"
            />
            <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div className="label-xs">Mission Time</div>
              <div className="mono tabular text-[20px] text-[var(--white)]">
                <span className="text-[var(--cyan)]">
                  {formatMinutes(currentTime)}
                </span>
                <span className="text-[var(--gray-500)]"> / </span>
                <span className="text-[var(--gray-300)]">
                  {formatMinutes(duration)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatValue
                label="Fatigue"
                value={Math.round(metrics.fatigue)}
                size="lg"
                className="bg-[#09101d] border border-[var(--border)] p-3 rounded shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
              />
              <StatValue
                label="Mobility"
                value={Math.round(metrics.mobility)}
                size="lg"
                className="bg-[#09101d] border border-[var(--border)] p-3 rounded shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
              />
              <StatValue
                label="Endurance"
                value={Math.round(metrics.endurance)}
                size="lg"
                className="bg-[#09101d] border border-[var(--border)] p-3 rounded shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
              />
              <StatValue
                label="Performance"
                value={Math.round(metrics.performance)}
                size="lg"
                className="bg-[#09101d] border border-[var(--border)] p-3 rounded shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden"
              />
            </div>

            {soldier ? (
              <div className="mt-5 border-t border-[var(--border)]/60 pt-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-1.5 h-1.5 bg-[var(--cyan)] rounded-full opacity-60" />
                  <div className="label-xs text-[var(--gray-300)] uppercase tracking-widest">Baseline Capacity</div>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] mono text-[var(--gray-500)] tracking-wider">
                  <div className="flex justify-between items-center border-b border-[var(--border)]/40 pb-1">
                    <span>MOBILITY</span>
                    <span className="text-[var(--cyan)] font-semibold">{soldier.baselineMobility}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border)]/40 pb-1">
                    <span>ENDURANCE</span>
                    <span className="text-[var(--cyan)] font-semibold">{soldier.baselineEndurance}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border)]/40 pb-1">
                    <span>STRENGTH</span>
                    <span className="text-[var(--cyan)] font-semibold">{soldier.baselineStrength}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border)]/40 pb-1">
                    <span>RECOVERY</span>
                    <span className="text-[var(--cyan)] font-semibold">{soldier.baselineRecovery}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel className="!p-0 border border-[var(--border)] overflow-hidden flex flex-col bg-[#09101d]">
            <button
              type="button"
              onClick={() => setWhyOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--gray-800)]/40 transition-colors"
              aria-expanded={whyOpen}
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="text-[12px] font-semibold text-[var(--cyan)] uppercase tracking-wider mono">
                    Model Reasoning
                  </div>
                </div>
                <div className="text-[11px] text-[var(--gray-400)]">
                  Why did performance change?
                </div>
              </div>
              <span
                className={cn(
                  "mono text-[12px] text-[var(--cyan)] transition-transform",
                  whyOpen && "rotate-90"
                )}
              >
                ›
              </span>
            </button>
            {whyOpen ? (
              <div className="border-t border-[var(--border)] bg-[#070c17] px-4 py-3">
                <ul className="space-y-2">
                  {explanations.length === 0 ? (
                    <li className="text-[11px] text-[var(--gray-500)] font-mono flex items-start gap-2">
                      <span className="text-[var(--cyan)] mt-0.5">›</span>
                      No dominant stress factors exceeded explanation thresholds.
                    </li>
                  ) : (
                    explanations.map((line) => (
                      <li
                        key={line}
                        className="text-[11px] leading-relaxed text-[var(--gray-300)] font-mono flex items-start gap-2"
                      >
                        <span className="text-[var(--cyan)] mt-0.5">›</span>
                        <span>{line}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>

      {/* Chart & Elevation */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <Panel className="!p-5">
          <SectionHeader
            title="Performance Timeline"
            subtitle="Full curve with mission-time cursor"
          />
          <SimulationChart
            data={snapshots}
            height={220}
            currentTime={chartCursor}
          />
        </Panel>
        
        <div className="flex flex-col justify-end w-full lg:w-[320px]">
          <ElevationProfile 
            progress={progress} 
            altitudeMeters={scenario.altitudeMeters}
            className="w-full"
          />
        </div>
      </div>

      <p className="text-[11px] text-[var(--gray-500)]">
        Prototype simulation — relative indices (0–100), not clinical measurements.
        Rest {scenario.restMinutes} min · Distance{" "}
        <span className="mono tabular">{scenario.distanceKm} km</span>.
      </p>
    </div>
  );
}
