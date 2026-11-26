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
import type { MissionInputs, NormalizedFactors, PerformancePoint, SoldierBaseline } from "@/lib/simulation/types";
import { terrainLabel } from "@/lib/simulation/factors";
import type { TerrainType, TimeOfDay } from "@/lib/simulation/types";
import { cn, formatMinutes } from "@/lib/utils";
import { runSimulation, normalizeFactors, strengthAvailabilityAt } from "@/lib/simulation";

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
  provenance?: { mobility: string; endurance: string; strength: string; recovery: string; typicalLoad: string };
  fitnessAssessment?: string | null;
  assessmentSource?: string | null;
} & SoldierBaseline;

export type LibrarySoldier = SimulatorSoldier & { name: string; status: string; squadId: string; squadName: string; platoonId: string | null; platoonName: string | null; companyId: string | null; companyName: string | null; unitId: string; unitName: string };

const UPDATE_STEP_MIN = 0.5;
const controlInput = "mt-1 block w-full rounded border border-[var(--border)] bg-[#090f1b] px-2 py-1.5 text-[11px] text-[var(--white)]";

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
  snapshots,
  explanations,
  source,
  modelVersion,
  snapshotStatus,
  resultSoldier,
  factors,
  inputs,
  roster,
  formationRosters,
  availableSoldiers,
  sourceRunId,
  organization,
}: {
  scenario: SimulatorScenario;
  snapshots: PerformancePoint[];
  explanations: string[];
  source: "stored" | "computed";
  modelVersion: string | null;
  snapshotStatus: "complete" | "legacy" | "preview";
  resultSoldier: SimulatorSoldier | null;
  factors: NormalizedFactors;
  inputs: MissionInputs;
  roster: Array<{ id: string; soldierCode: string }>;
  formationRosters: Partial<Record<EchelonLevel, Array<{ id: string; soldierCode: string }>>>;
  availableSoldiers: LibrarySoldier[];
  sourceRunId: string | null;
  organization: { squadId: string | null; platoonId: string | null; companyId: string | null; unitId: string | null };
}) {
  const shownSoldier = resultSoldier;
  const availableEchelons = (Object.keys(formationRosters) as EchelonLevel[]).filter((level) => Boolean(formationRosters[level]?.length));
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(scenario.soldierId);
  const selectedRosterSoldier = roster.find((member) => member.id === selectedRosterId);
  const [activeInputs, setActiveInputs] = useState<MissionInputs>(inputs);
  const [draftInputs, setDraftInputs] = useState<MissionInputs>(inputs);
  const [activeSnapshots, setActiveSnapshots] = useState<PerformancePoint[]>(snapshots);
  const [activeExplanations, setActiveExplanations] = useState<string[]>(explanations);
  const [whatIfApplied, setWhatIfApplied] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [echelon, setEchelon] = useState<EchelonLevel>(availableEchelons.includes("SQUAD") ? "SQUAD" : availableEchelons[0] ?? "SOLDIER");
  const formationRoster = formationRosters[echelon] ?? [];
  const duration = Math.max(
    1,
    activeInputs.durationMinutes,
    activeSnapshots[activeSnapshots.length - 1]?.timeMinutes ?? 0
  );

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [whyOpen, setWhyOpen] = useState(true);
  const [impactLevel, setImpactLevel] = useState<EchelonLevel>(organization.squadId ? "SQUAD" : organization.platoonId ? "PLATOON" : organization.companyId ? "COMPANY" : organization.unitId ? "UNIT" : "SOLDIER");
  const [compareOpen, setCompareOpen] = useState(false);
  const [soldierSearch, setSoldierSearch] = useState("");
  const [selectedSoldiers, setSelectedSoldiers] = useState<string[]>([]);
  const [comparison, setComparison] = useState<Array<{ soldier: LibrarySoldier; snapshots: PerformancePoint[] }>>([]);

  // Echelon Controls State
  const [cameraMode, setCameraMode] = useState<CameraMode>("FOLLOW");
  const [viewType, setViewType] = useState<ViewType>("3D");

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
    () => sampleAt(activeSnapshots, currentTime),
    [activeSnapshots, currentTime]
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  // Quantize terrain progress so Three.js doesn't update every 0.5 min tick thrash
  const terrainProgress = Math.round(progress * 40) / 40;

  const chartCursor = Math.round(currentTime);
  const inputKeys = Object.keys(activeInputs) as Array<keyof MissionInputs>;
  const changedInputs = inputKeys.filter((key) => activeInputs[key] !== inputs[key]);
  const draftChanges = inputKeys.filter((key) => draftInputs[key] !== activeInputs[key]);
  const applyWhatIf = () => {
    const result = runSimulation(draftInputs, shownSoldier ?? undefined);
    const commonTime = Math.min(activeSnapshots.at(-1)?.timeMinutes ?? result.final.timeMinutes, result.final.timeMinutes);
    const previousFinal = sampleAt(activeSnapshots, commonTime);
    const nextFinal = sampleAt(result.snapshots, commonTime);
    const inputSummary = draftChanges.map((key) => `${String(key)} changed from ${activeInputs[key]} to ${draftInputs[key]}`).join("; ");
    const outputSummary = previousFinal ? `At the shared ${formatMinutes(commonTime)} checkpoint, fatigue changed ${(nextFinal.fatigue - previousFinal.fatigue).toFixed(1)} points, mobility ${(nextFinal.mobility - previousFinal.mobility).toFixed(1)}, endurance ${(nextFinal.endurance - previousFinal.endurance).toFixed(1)}, and performance ${(nextFinal.performance - previousFinal.performance).toFixed(1)} versus the prior version.` : "No prior trajectory was available for a direct comparison.";
    setActiveInputs({ ...draftInputs }); setActiveSnapshots(result.snapshots); setActiveExplanations([...result.explanations, `What-if inputs: ${inputSummary || "no changes"}.`, outputSummary, "This comparison uses the same saved baseline and deterministic model; it is not a measured outcome or prediction."]);
    setWhatIfApplied(true); setPlaying(false); commitTime(0);
  };
  const impactPopulation = useMemo(() => availableSoldiers.filter((member) => {
    if (impactLevel === "SOLDIER") return member.id === shownSoldier?.id;
    if (impactLevel === "SQUAD") return organization.squadId !== null && member.squadId === organization.squadId;
    if (impactLevel === "PLATOON") return organization.platoonId !== null && member.platoonId === organization.platoonId;
    if (impactLevel === "COMPANY") return organization.companyId !== null && member.companyId === organization.companyId;
    if (impactLevel === "UNIT") return organization.unitId !== null && member.unitId === organization.unitId;
    return false;
  }), [availableSoldiers, impactLevel, organization, shownSoldier?.id]);
  const impactOptions = ([
    { level: "SOLDIER", label: "Soldier Overview", available: Boolean(shownSoldier) },
    { level: "SQUAD", label: "Squad Overview", available: Boolean(organization.squadId) },
    { level: "PLATOON", label: "Platoon Overview", available: Boolean(organization.platoonId) },
    { level: "COMPANY", label: "Company Overview", available: Boolean(organization.companyId) },
    { level: "UNIT", label: "Unit Overview", available: Boolean(organization.unitId) },
  ] satisfies Array<{ level: EchelonLevel; label: string; available: boolean }>).filter((option) => option.available);
  const impactMembers = useMemo(() => impactPopulation.filter((member) => member.status === "ACTIVE"), [impactPopulation]);
  const impactRows = useMemo(() => impactMembers.map((soldier) => ({ soldier, snapshots: runSimulation(activeInputs, soldier).snapshots })), [impactMembers, activeInputs]);
  const checkpointMembers = useMemo(() => impactRows.map((row) => ({ ...row, point: sampleAt(row.snapshots, currentTime) })), [impactRows, currentTime]);
  const avg = (values: number[]) => values.length ? round1(values.reduce((sum, n) => sum + n, 0) / values.length) : null;
  const spread = (values: number[]) => values.length ? round1(Math.max(...values) - Math.min(...values)) : null;
  const filteredSoldiers = useMemo(() => availableSoldiers.filter((soldier) => `${soldier.soldierCode} ${soldier.name} ${soldier.squadName} ${soldier.unitName}`.toLowerCase().includes(soldierSearch.toLowerCase())), [availableSoldiers, soldierSearch]);
  const analyzeSelected = () => {
    setComparison(availableSoldiers.filter((soldier) => selectedSoldiers.includes(soldier.id)).map((soldier) => ({ soldier, snapshots: runSimulation(activeInputs, soldier).snapshots })));
    setCompareOpen(false);
  };
  const missionEvidenceCount = [activeInputs.terrainType !== null, Number.isFinite(activeInputs.altitudeMeters), Number.isFinite(activeInputs.temperatureCelsius), Number.isFinite(activeInputs.loadKg), Number.isFinite(activeInputs.distanceKm), Number.isFinite(activeInputs.durationMinutes), Number.isFinite(activeInputs.restMinutes), Boolean(activeInputs.timeOfDay)].filter(Boolean).length;
  const knownBaselineCount = shownSoldier?.provenance ? Object.values(shownSoldier.provenance).filter((value) => value === "KNOWN").length : 0;
  const evidenceCoverage = Math.round(((missionEvidenceCount + knownBaselineCount) / 13) * 100);
  const impactMobility = checkpointMembers.map((row) => row.point.mobility);
  const impactEndurance = checkpointMembers.map((row) => row.point.endurance);
  const impactFatigue = checkpointMembers.map((row) => row.point.fatigue);
  const impactBaselineMobility = checkpointMembers.map((row) => row.soldier.baselineMobility);
  const impactBaselineEndurance = checkpointMembers.map((row) => row.soldier.baselineEndurance);
  const mobilityDelta = avg(impactMobility) !== null && avg(impactBaselineMobility) !== null ? round1(avg(impactMobility)! - avg(impactBaselineMobility)!) : null;
  const enduranceDelta = avg(impactEndurance) !== null && avg(impactBaselineEndurance) !== null ? round1(avg(impactEndurance)! - avg(impactBaselineEndurance)!) : null;
  const profileCompleteness = (soldier: LibrarySoldier) => Math.round(Object.values(soldier.provenance ?? {}).filter((value) => value === "USER_ENTERED" || value === "IMPORTED").length / 5 * 100);
  const impactCompleteness = impactPopulation.length ? Math.round(impactPopulation.reduce((sum, member) => sum + profileCompleteness(member), 0) / impactPopulation.length) : 0;
  const impactExcluded = impactPopulation.length - impactMembers.length;
  const impactProfilesWithGaps = impactPopulation.filter((member) => profileCompleteness(member) < 100).length;

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
            <StatusBadge tone={snapshotStatus === "complete" ? "cyan" : "muted"}>
              {snapshotStatus === "complete" ? `Model ${modelVersion}` : snapshotStatus === "legacy" ? "Legacy run · inputs not recorded" : "Preview · not saved"}
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
            {terrainLabel(activeInputs.terrainType)} ·{" "}
            <span className="mono tabular">{activeInputs.altitudeMeters} m</span> ·{" "}
            <span className="mono tabular">{activeInputs.temperatureCelsius}°C</span> ·{" "}
            <span className="mono tabular">{activeInputs.loadKg} kg</span> ·{" "}
            {activeInputs.timeOfDay}
            {shownSoldier ? (
              <>
                {" "}
                · Soldier{" "}
                <span className="mono text-[var(--off-white)]">
                  {shownSoldier?.soldierCode}
                </span>
              </>
            ) : null}
            <div className="mt-4 rounded border border-[var(--cyan)]/25 bg-[var(--cyan)]/[0.04] p-3">
              <div className="flex items-center justify-between gap-2"><div><div className="label-xs">Evidence Coverage</div><div className="mono mt-1 text-[28px] font-semibold text-[var(--cyan)]">{evidenceCoverage}%</div></div><StatusBadge tone="muted">DATA COVERAGE ONLY</StatusBadge></div>
              <p className="mt-1 text-[10px] text-[var(--gray-300)]">This measures available mission inputs and known baseline provenance. It is not a probability of performance or success.</p>
              <p className="mt-1 text-[10px] text-[var(--gray-500)]">Mission inputs: {missionEvidenceCount}/8 present · Baseline provenance: {knownBaselineCount}/5 known · Fitness assessment: {shownSoldier?.fitnessAssessment ? `on file${shownSoldier.assessmentSource ? ` (${shownSoldier.assessmentSource})` : ""}; not used by the engine` : "not on file; not used by the engine"}. Synthetic or unknown baselines are not counted as known.</p>
            </div>
            {shownSoldier ? <div className="mt-3 rounded border border-[var(--border)] p-3"><div className="label-xs">Mission-Specific Assessment · {formatMinutes(currentTime)}</div><p className="mt-1 text-[11px] leading-relaxed text-[var(--gray-300)]">Under the current scenario inputs, modeled mobility is {(metrics.mobility - shownSoldier.baselineMobility).toFixed(1)} points from this profile&apos;s baseline, endurance is {(metrics.endurance - shownSoldier.baselineEndurance).toFixed(1)}, and strength availability is {(strengthAvailabilityAt(normalizeFactors(activeInputs), shownSoldier, metrics.fatigue) - shownSoldier.baselineStrength).toFixed(1)} from baseline. These relative model outputs describe this scenario only; they do not indicate universal suitability or validated future performance.</p></div> : null}
            <button type="button" onClick={() => setControlsOpen((open) => !open)} aria-expanded={controlsOpen} className="mt-4 flex w-full items-center justify-between border-t border-[var(--border)] pt-3 text-left"><span><span className="label-xs">Scenario Controls</span><span className="block text-[10px] text-[var(--gray-500)]">Create a what-if version without changing the saved run</span></span><span className="text-[var(--cyan)]">{controlsOpen ? "−" : "+"}</span></button>
            {controlsOpen ? <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--gray-400)]">
                <label>Carried load (kg)<input className={controlInput} type="number" min="0" max="100" value={draftInputs.loadKg} onChange={(e) => setDraftInputs({ ...draftInputs, loadKg: Number(e.target.value) })} /></label>
                <label>Distance (km)<input className={controlInput} type="number" min="0" max="1000" value={draftInputs.distanceKm} onChange={(e) => setDraftInputs({ ...draftInputs, distanceKm: Number(e.target.value) })} /></label>
                <label>Duration (min)<input className={controlInput} type="number" min="1" max="43200" value={draftInputs.durationMinutes} onChange={(e) => setDraftInputs({ ...draftInputs, durationMinutes: Number(e.target.value) })} /></label>
                <label>Rest input (min)<input className={controlInput} type="number" min="0" max="1440" value={draftInputs.restMinutes} onChange={(e) => setDraftInputs({ ...draftInputs, restMinutes: Number(e.target.value) })} /></label>
                <label>Temperature (°C)<input className={controlInput} type="number" min="-50" max="55" value={draftInputs.temperatureCelsius} onChange={(e) => setDraftInputs({ ...draftInputs, temperatureCelsius: Number(e.target.value) })} /></label>
                <label>Altitude (m)<input className={controlInput} type="number" min="0" max="9000" value={draftInputs.altitudeMeters} onChange={(e) => setDraftInputs({ ...draftInputs, altitudeMeters: Number(e.target.value) })} /></label>
                <label>Terrain<select className={controlInput} value={draftInputs.terrainType} onChange={(e) => setDraftInputs({ ...draftInputs, terrainType: e.target.value as TerrainType })}>{["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"].map((terrain) => <option key={terrain} value={terrain}>{terrainLabel(terrain as TerrainType)}</option>)}</select></label>
                <label>Time of day<select className={controlInput} value={draftInputs.timeOfDay} onChange={(e) => setDraftInputs({ ...draftInputs, timeOfDay: e.target.value as TimeOfDay })}><option value="DAY">Day</option><option value="NIGHT">Night</option></select></label>
              </div>
              {draftChanges.length ? <p className="text-[10px] text-amber-200">Draft changes: {draftChanges.map((key) => `${key} (${String(activeInputs[key])} → ${String(draftInputs[key])})`).join(" · ")}</p> : null}
              <div className="flex flex-wrap gap-2"><Button size="sm" disabled={!draftChanges.length} onClick={applyWhatIf}>Apply Changes / Recalculate</Button><Button size="sm" variant="ghost" onClick={() => setDraftInputs(activeInputs)}>Reset draft</Button></div>
              {whatIfApplied ? <p className="text-[10px] text-[var(--cyan)]">Unsaved what-if version based on {sourceRunId ? `saved run ${sourceRunId}` : "this scenario preview"}. Original snapshots remain unchanged. Active changes: {changedInputs.length ? changedInputs.join(", ") : "none"}.</p> : null}
            </div> : null}
            <Button className="mt-3 w-full" size="sm" variant="secondary" onClick={() => setCompareOpen(true)}>Compare More Soldiers</Button>
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
        onSelectEchelon={(level) => { setEchelon(level); setImpactLevel(level); }}
        cameraMode={cameraMode}
        onSelectCameraMode={setCameraMode}
        viewType={viewType}
        onSelectViewType={setViewType}
        availableEchelons={availableEchelons}
        memberCount={formationRoster.length}
        soldierCode={shownSoldier?.soldierCode}
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
            roster={formationRoster}
            onSelectSoldier={setSelectedRosterId}
            selectedSoldierId={selectedRosterId}
            terrainType={activeInputs.terrainType}
            altitudeMeters={activeInputs.altitudeMeters}
            distanceKm={activeInputs.distanceKm}
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

            {shownSoldier ? (
              <div className="mt-5 border-t border-[var(--border)]/60 pt-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-1.5 h-1.5 bg-[var(--cyan)] rounded-full opacity-60" />
                  <div className="label-xs text-[var(--gray-300)] uppercase tracking-widest">Baseline Capacity</div>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] mono text-[var(--gray-500)] tracking-wider">
                  <div className="flex justify-between items-center border-b border-[var(--border)]/40 pb-1">
                    <span>MOBILITY</span>
                    <span className="text-[var(--cyan)] font-semibold">{shownSoldier.baselineMobility}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border)]/40 pb-1">
                    <span>ENDURANCE</span>
                    <span className="text-[var(--cyan)] font-semibold">{shownSoldier.baselineEndurance}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border)]/40 pb-1">
                    <span>STRENGTH</span>
                    <span className="text-[var(--cyan)] font-semibold">{shownSoldier.baselineStrength}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border)]/40 pb-1">
                    <span>RECOVERY</span>
                    <span className="text-[var(--cyan)] font-semibold">{shownSoldier.baselineRecovery}</span>
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
                  {activeExplanations.length === 0 ? (
                    <li className="text-[11px] text-[var(--gray-500)] font-mono flex items-start gap-2">
                      <span className="text-[var(--cyan)] mt-0.5">›</span>
                      No dominant stress factors exceeded explanation thresholds.
                    </li>
                  ) : (
                    activeExplanations.map((line) => (
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

      <Panel className="!p-5 space-y-4">
        <SectionHeader title="Unit-Level Impact" subtitle={`Calculated from saved roster profiles under the current ${whatIfApplied ? "what-if" : "saved"} mission inputs · current checkpoint ${formatMinutes(currentTime)}`} action={<StatusBadge tone="cyan">DESCRIPTIVE ONLY</StatusBadge>} />
        <div className="flex flex-wrap items-center gap-3"><select className={controlInput} value={impactLevel} onChange={(e) => { const level = e.target.value as EchelonLevel; setImpactLevel(level); if (availableEchelons.includes(level)) setEchelon(level); }}>{impactOptions.map((option) => <option value={option.level} key={option.level}>{option.label}</option>)}</select><span className="text-[11px] text-[var(--gray-400)]">{impactMembers.length} active profiles modeled from {impactPopulation.length} in this group · {impactExcluded} inactive excluded · profile evidence {impactCompleteness}%</span></div>
        {!impactMembers.length ? <p className="text-[12px] text-[var(--gray-500)]">No saved personnel records are linked at this organizational level.</p> : <>
          <p className="text-[12px] leading-relaxed text-[var(--gray-300)]">At this checkpoint, the {impactLevel.toLowerCase()} has mean modeled mobility {avg(impactMobility)?.toFixed(1) ?? "—"} ({mobilityDelta !== null && mobilityDelta > 0 ? "+" : ""}{mobilityDelta?.toFixed(1) ?? "—"} from baseline) and endurance {avg(impactEndurance)?.toFixed(1) ?? "—"} ({enduranceDelta !== null && enduranceDelta > 0 ? "+" : ""}{enduranceDelta?.toFixed(1) ?? "—"} from baseline). The member-to-member spread is {spread(impactEndurance)?.toFixed(1) ?? "—"} points for endurance and {spread(impactFatigue)?.toFixed(1) ?? "—"} for fatigue. The group average is the mean of each active member&apos;s existing model result using the same mission conditions and that member&apos;s own baseline. {impactProfilesWithGaps} profile(s) have incomplete or unverified provenance, so interpret those comparisons cautiously. These are simulated indices, not observed measurements.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Mobility", avg(impactMobility), spread(impactMobility)], ["Endurance", avg(impactEndurance), spread(impactEndurance)], ["Fatigue", avg(impactFatigue), spread(impactFatigue)], ["Recovery baseline", avg(checkpointMembers.map((row) => row.soldier.baselineRecovery)), spread(checkpointMembers.map((row) => row.soldier.baselineRecovery))]].map(([label, mean, range]) => <div key={String(label)} className="rounded border border-[var(--border)] bg-[#090f1b] p-3"><div className="label-xs">{label}</div><div className="mono mt-1 text-lg text-[var(--cyan)]">{typeof mean === "number" ? mean.toFixed(1) : "—"}</div><div className="text-[10px] text-[var(--gray-500)]">Across-profile spread {typeof range === "number" ? range.toFixed(1) : "—"} points</div></div>)}</div>
          <p className="text-[10px] text-[var(--gray-500)]">The view follows the saved Soldier → Squad → Platoon → Company → Unit hierarchy. No Battalion level exists in the current roster schema. {impactExcluded} inactive profile(s) were excluded; {impactProfilesWithGaps} profile(s) have incomplete or unverified provenance. Each included profile uses the same mission inputs and existing simulation engine. No deployment or tactical recommendation is generated.</p>
        </>}
      </Panel>

      {comparison.length ? <Panel className="!p-5 space-y-4"><SectionHeader title="Soldier Comparison" subtitle="Same mission inputs and simulation checkpoints for every selected profile" action={<Button size="sm" variant="ghost" onClick={() => setComparison([])}>Clear comparison</Button>} /><div className="grid gap-3 xl:grid-cols-2">{comparison.map(({ soldier, snapshots: trajectory }) => { const coverage = profileCompleteness(soldier); return <div key={soldier.id} className="rounded border border-[var(--border)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><a href={`/soldiers/${soldier.id}`} className="text-[13px] font-semibold text-[var(--cyan)] hover:underline">{soldier.soldierCode} · {soldier.name}</a><div className="text-[10px] text-[var(--gray-500)]">{soldier.squadName} · {soldier.unitName}</div></div><StatusBadge tone="muted">{coverage}% baseline provenance known</StatusBadge></div><div className="mt-2 grid grid-cols-4 gap-2 text-[10px] text-[var(--gray-400)]">{[["Mobility", soldier.baselineMobility], ["Endurance", soldier.baselineEndurance], ["Strength", soldier.baselineStrength], ["Recovery", soldier.baselineRecovery]].map(([label, value]) => <div key={String(label)}>{label}<div className="mono text-[var(--white)]">{value}</div></div>)}</div><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-[10px]"><thead className="text-[var(--gray-500)]"><tr><th>Time</th><th>Mobility</th><th>Endurance</th><th>Strength*</th><th>Fatigue</th><th>Performance</th></tr></thead><tbody>{trajectory.map((point) => <tr key={point.timeMinutes} className="border-t border-[var(--border)] text-[var(--gray-300)]"><td className="mono">{formatMinutes(point.timeMinutes)}</td><td>{point.mobility.toFixed(1)}</td><td>{point.endurance.toFixed(1)}</td><td>{strengthAvailabilityAt(normalizeFactors(activeInputs), soldier, point.fatigue).toFixed(1)}</td><td>{point.fatigue.toFixed(1)}</td><td>{point.performance.toFixed(1)}</td></tr>)}</tbody></table></div><p className="mt-2 text-[9px] text-[var(--gray-500)]">*Strength availability uses the existing model calculation. Recovery is a baseline input; the model does not produce a separate recovery trajectory. Missing fitness assessment: {soldier.fitnessAssessment ? "none" : "not on file"}; assessment provenance {soldier.assessmentSource ?? "unknown"}.</p></div>; })}</div><p className="text-[10px] text-[var(--gray-500)]">Side-by-side descriptive trajectories only. No ranking or suitability score is calculated.</p></Panel> : null}

      {compareOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Compare more soldiers"><Panel className="max-h-[90vh] w-full max-w-5xl overflow-auto !p-5"><div className="flex items-center justify-between gap-3"><SectionHeader title="Compare More Soldiers" subtitle="Select profiles from the Soldier Library; current mission inputs will be reused"/><Button size="sm" variant="ghost" onClick={() => setCompareOpen(false)}>Close</Button></div><div className="mt-3 flex flex-wrap items-center gap-3"><input className={controlInput} placeholder="Search ID, name, squad or unit" value={soldierSearch} onChange={(e) => setSoldierSearch(e.target.value)}/><span className="text-[11px] text-[var(--gray-400)]">{selectedSoldiers.length} selected</span><button className="text-[10px] text-[var(--cyan)]" onClick={() => setSelectedSoldiers(filteredSoldiers.map((soldier) => soldier.id))}>Select filtered</button><button className="text-[10px] text-[var(--gray-400)]" onClick={() => setSelectedSoldiers([])}>Clear</button></div><div className="mt-3 max-h-[55vh] overflow-auto"><table className="w-full min-w-[850px] text-left text-[10px]"><thead className="sticky top-0 bg-[#0b1220] text-[var(--gray-500)]"><tr><th>Select</th><th>Soldier ID</th><th>Name</th><th>Squad / Unit</th><th>Mobility</th><th>Endurance</th><th>Strength</th><th>Recovery</th><th>Evidence</th></tr></thead><tbody>{filteredSoldiers.map((soldier) => <tr key={soldier.id} className="border-t border-[var(--border)] text-[var(--gray-300)]"><td><input type="checkbox" checked={selectedSoldiers.includes(soldier.id)} onChange={(e) => setSelectedSoldiers((current) => e.target.checked ? [...new Set([...current, soldier.id])] : current.filter((id) => id !== soldier.id))}/></td><td className="mono">{soldier.soldierCode}</td><td>{soldier.name}</td><td>{soldier.squadName} / {soldier.unitName}</td><td>{soldier.baselineMobility}</td><td>{soldier.baselineEndurance}</td><td>{soldier.baselineStrength}</td><td>{soldier.baselineRecovery}</td><td>{profileCompleteness(soldier)}%</td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between"><span className="text-[10px] text-[var(--gray-500)]">Evidence percentage reflects profile provenance only, not predicted performance.</span><Button size="sm" disabled={!selectedSoldiers.length} onClick={analyzeSelected}>Analyze Selected</Button></div></Panel></div> : null}

      {/* Chart & Elevation */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <Panel className="!p-5">
          <SectionHeader
            title="Performance Timeline"
            subtitle="Full curve with mission-time cursor"
          />
          <SimulationChart
            data={activeSnapshots}
            height={220}
            currentTime={chartCursor}
            visibleThroughTime={currentTime}
          />
        </Panel>
        
        <div className="flex flex-col justify-end w-full lg:w-[320px]">
          <ElevationProfile 
            progress={progress} 
            altitudeMeters={activeInputs.altitudeMeters}
            className="w-full"
          />
        </div>
      </div>

      <Panel className="!p-5 space-y-3">
        <SectionHeader title="Recorded mission & model" subtitle="Run input values and normalized prototype factors" />
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-[12px]">
          <div className="text-[var(--gray-400)]">Terrain · time <span className="text-[var(--off-white)]">{terrainLabel(activeInputs.terrainType)} · {activeInputs.timeOfDay}</span></div>
          <div className="text-[var(--gray-400)]">Altitude · temperature <span className="text-[var(--off-white)]">{activeInputs.altitudeMeters} m · {activeInputs.temperatureCelsius}°C</span></div>
          <div className="text-[var(--gray-400)]">Load · distance <span className="text-[var(--off-white)]">{activeInputs.loadKg} kg · {activeInputs.distanceKm} km</span></div>
          <div className="text-[var(--gray-400)]">Duration · assumed rest <span className="text-[var(--off-white)]">{formatMinutes(activeInputs.durationMinutes)} · {activeInputs.restMinutes} min</span></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-4 text-[11px] mono text-[var(--gray-400)]">
          {Object.entries(factors).filter(([key]) => key !== "environmentStress").map(([key, value]) => <div key={key}>{key.replace("Factor", "")} <span className="text-[var(--cyan)]">{value.toFixed(2)}</span></div>)}
        </div>
        <p className="text-[11px] text-[var(--gray-400)]">
          {shownSoldier ? `Baseline snapshot for ${shownSoldier.soldierCode}: mobility ${shownSoldier.baselineMobility}, endurance ${shownSoldier.baselineEndurance}, strength ${shownSoldier.baselineStrength}, recovery ${shownSoldier.baselineRecovery}, experience ${shownSoldier.experienceYears} y. Typical load ${shownSoldier.typicalLoadKg} kg is a builder default; mission load above drives the load factor.` : "No soldier selected. This run uses the explicitly labeled generic prototype baseline."}
        </p>
        <p className="text-[11px] text-[var(--gray-500)]">
          Age, height, weight, and free-text fitness assessment are not used: this prototype has no documented model relationship for them. Curves and indices are deterministic estimates, not measured physiology or validated predictions. Recovery pulses are a simplified periodic assumption based on rest minutes and recovery baseline; they are not a schedule of observed rest periods. Strength availability is calculated but no strength time series is stored.
        </p>
      </Panel>
      <Panel className="!p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-[var(--gray-300)]">{formationRoster.length ? <>Formation roster: <span className="mono text-[var(--cyan)]">{formationRoster.length}</span> persisted {echelon.toLowerCase()} members · each figure maps to one soldier record</> : "No saved roster is linked at this organization level; no soldier figures are simulated."}</div>
        {selectedRosterSoldier ? <Button href={`/soldiers/${selectedRosterSoldier.id}`} variant="secondary" size="sm">Selected {selectedRosterSoldier.soldierCode} · View profile</Button> : <span className="text-[11px] text-[var(--gray-500)]">Select a figure in the 3D formation to open its profile.</span>}
      </Panel>
      <p className="text-[11px] text-[var(--gray-500)]">
        Prototype simulation — relative indices (0–100), not clinical measurements.
        Rest {activeInputs.restMinutes} min · Distance{" "}
        <span className="mono tabular">{activeInputs.distanceKm} km</span>.
      </p>
    </div>
  );
}
