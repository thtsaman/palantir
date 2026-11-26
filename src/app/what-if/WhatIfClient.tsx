"use client";

import { useMemo, useState } from "react";
import { ComparisonChart } from "@/components/charts/ComparisonChart";
import { Button } from "@/components/ui/Button";
import { SliderField } from "@/components/ui/SliderField";
import {
  PageHeader,
  Panel,
  SectionHeader,
  StatValue,
  StatusBadge,
} from "@/components/ui/primitives";
import { compareScenarios, normalizeFactors, strengthAvailabilityAt } from "@/lib/simulation";
import { simulateRoster } from "@/lib/simulation/group";
import type {
  MissionInputs,
  ScenarioComparisonResult,
  TerrainType,
  TimeOfDay,
  SoldierBaseline,
} from "@/lib/simulation";
import { terrainLabel } from "@/lib/simulation/factors";
import { cn, formatHoursLabel } from "@/lib/utils";
import { HistoricalContextPanel } from "@/components/historical/HistoricalContextPanel";
import { MissionTerrain } from "@/components/simulator/MissionTerrain";

const TERRAIN: TerrainType[] = [
  "FLAT",
  "ROLLING",
  "MOUNTAIN",
  "STEEP_MOUNTAIN",
  "MIXED",
  "DESERT",
  "FOREST",
];

const METRICS = ["performance", "fatigue", "mobility", "endurance", "strength"] as const;
type Metric = (typeof METRICS)[number];
const MAX_VARIATIONS = 5;
type Variation = { id: string; name: string; inputs: MissionInputs };

const inputClass =
  "h-9 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--ink)] px-2.5 text-[13px] text-[var(--off-white)] focus:border-[var(--cyan)]/45 focus:outline-none";

const DEFAULT_A: MissionInputs = {
  loadKg: 18,
  altitudeMeters: 3500,
  temperatureCelsius: -5,
  durationMinutes: 480,
  restMinutes: 15,
  terrainType: "MOUNTAIN",
  timeOfDay: "NIGHT",
  distanceKm: 12,
};

type SoldierOption = { id: string; soldierCode: string } & SoldierBaseline;
type GroupOption = { id: string; groupType: "UNIT" | "SQUAD"; label: string; members: Array<{ id: string; soldierCode: string; status: string; baselineMobility: number; baselineEndurance: number; baselineStrength: number; baselineRecovery: number; experienceYears: number; typicalLoadKg: number; mobilityProvenance: string | null; enduranceProvenance: string | null; strengthProvenance: string | null; recoveryProvenance: string | null; typicalLoadProvenance: string | null }> };

export function WhatIfClient({
  initialInputs, initialBaseline, initialSoldierId, initialScenarioName, soldiers, groupOptions,
}: {
  initialInputs: MissionInputs | null;
  initialBaseline: Partial<SoldierBaseline> | null;
  initialSoldierId: string | null;
  initialScenarioName: string | null;
  soldiers: SoldierOption[];
  groupOptions: GroupOption[];
}) {
  const [baseline, setBaseline] = useState<MissionInputs>(initialInputs ?? DEFAULT_A);
  const [alternatives, setAlternatives] = useState<Variation[]>([{ id: "variation-1", name: "Reduced load · added rest", inputs: { ...(initialInputs ?? DEFAULT_A), loadKg: Math.max(5, (initialInputs ?? DEFAULT_A).loadKg - 4), restMinutes: Math.min(120, (initialInputs ?? DEFAULT_A).restMinutes + 15) } }]);
  const [soldierId, setSoldierId] = useState(initialSoldierId && soldiers.some((s) => s.id === initialSoldierId) ? initialSoldierId : "");
  const chosenSoldier = soldiers.find((s) => s.id === soldierId);
  const soldierBaseline = chosenSoldier ?? (initialSoldierId ? initialBaseline ?? undefined : undefined);
  const [result, setResult] = useState<ScenarioComparisonResult | null>(null);
  const [additionalResults, setAdditionalResults] = useState<Array<{ id: string; name: string; comparison: ScenarioComparisonResult }>>([]);
  const [metric, setMetric] = useState<Metric>("performance");
  const [compared, setCompared] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [groupComparison, setGroupComparison] = useState<{ baseline: ReturnType<typeof simulateRoster>; modified: ReturnType<typeof simulateRoster>; variations: Array<{ id: string; name: string; result: ReturnType<typeof simulateRoster> }> } | null>(null);
  const selectedGroup = groupOptions.find((group) => group.id === groupId);

  function runCompare() {
    if (alternatives.length === 0 || alternatives.length > MAX_VARIATIONS) return;
    setGroupComparison(null);
    setResult(null);
    setAdditionalResults([]);
    if (selectedGroup) {
      const roster = selectedGroup.members.map((member) => ({
        id: member.id, soldierCode: member.soldierCode, status: member.status,
        baseline: { baselineMobility: member.baselineMobility, baselineEndurance: member.baselineEndurance, baselineStrength: member.baselineStrength, baselineRecovery: member.baselineRecovery, experienceYears: member.experienceYears, typicalLoadKg: member.typicalLoadKg },
        provenanceComplete: Boolean(member.mobilityProvenance && member.enduranceProvenance && member.strengthProvenance && member.recoveryProvenance && member.typicalLoadProvenance),
      }));
      const baseGroup = simulateRoster(baseline, roster);
      const variations = alternatives.map((alternative) => ({ id: alternative.id, name: alternative.name, result: simulateRoster(alternative.inputs, roster) }));
      setGroupComparison({ baseline: baseGroup, modified: variations[0]!.result, variations });
      setCompared(true);
      return;
    }
    const comparisons = alternatives.map((alternative) => ({ id: alternative.id, name: alternative.name, comparison: compareScenarios(baseline, alternative.inputs, soldierBaseline) }));
    setResult(comparisons[0]?.comparison ?? null);
    setAdditionalResults(comparisons.slice(1));
    setCompared(true);
  }

  function updateBaseline(next: MissionInputs) { setBaseline(next); setCompared(false); }
  function updateVariation(id: string, next: MissionInputs) { setAlternatives((items) => items.map((item) => item.id === id ? { ...item, inputs: next } : item)); setCompared(false); }
  function addVariation() {
    if (alternatives.length >= MAX_VARIATIONS) return;
    setAlternatives((items) => [...items, { id: crypto.randomUUID(), name: `Alternative ${items.length + 1}`, inputs: { ...baseline } }]);
    setCompared(false);
  }
  function duplicateVariation(source: Variation) {
    if (alternatives.length >= MAX_VARIATIONS) return;
    setAlternatives((items) => [...items, { id: crypto.randomUUID(), name: `${source.name} copy`, inputs: { ...source.inputs } }]);
    setCompared(false);
  }
  function removeVariation(id: string) { setAlternatives((items) => items.filter((item) => item.id !== id)); setCompared(false); }

  const deltaRows = useMemo(() => {
    if (!result) return [];
    const baselineStrength = strengthAvailabilityAt(result.baseline.factors, result.baseline.baselineUsed, result.baseline.final.fatigue);
    const modifiedStrength = strengthAvailabilityAt(result.modified.factors, result.modified.baselineUsed, result.modified.final.fatigue);
    return [
      {
        key: "performance",
        label: "Performance",
        a: result.baseline.final.performance,
        b: result.modified.final.performance,
        delta: result.deltas.performance,
      },
      {
        key: "fatigue",
        label: "Fatigue",
        a: result.baseline.final.fatigue,
        b: result.modified.final.fatigue,
        delta: result.deltas.fatigue,
      },
      {
        key: "mobility",
        label: "Mobility",
        a: result.baseline.final.mobility,
        b: result.modified.final.mobility,
        delta: result.deltas.mobility,
      },
      {
        key: "endurance",
        label: "Endurance",
        a: result.baseline.final.endurance,
        b: result.modified.final.endurance,
        delta: result.deltas.endurance,
      },
      { key: "strength", label: "Strength availability", a: baselineStrength, b: modifiedStrength, delta: Math.round((modifiedStrength - baselineStrength) * 10) / 10 },
    ];
  }, [result]);
  const plainInterpretation = result ? `With ${result.primaryChanges.map((change) => `${change.label.toLowerCase()} changing from ${change.from} to ${change.to}`).join(", ") || "no mission inputs changed"}, the model produced ${deltaRows.filter((row) => row.delta !== 0).map((row) => `${row.label.toLowerCase()} ${row.delta > 0 ? "higher" : "lower"} by ${Math.abs(row.delta).toFixed(1)} points`).join(", ") || "no final index differences"} at the end of the modeled timeline. This describes the existing model’s output for these inputs; it does not isolate causality or predict real-world performance.` : "";

  return (
    <>
      <PageHeader
        eyebrow="Scenario Comparison"
        title="WHAT-IF SIMULATION"
        description="Set one baseline, create up to five controlled variations, then compare each against the same individual or group baselines."
        actions={
          <Button onClick={runCompare} size="sm" disabled={!alternatives.length}>
            Run Stress Test
          </Button>
        }
      />

      <Panel className="mb-4 !p-4 space-y-2">
        <label className="block space-y-1.5"><span className="label-xs">Compare individual or persisted group</span><select value={groupId} onChange={(event) => { setGroupId(event.target.value); setCompared(false); }} className={inputClass}><option value="">Individual baseline</option>{groupOptions.map((group) => <option key={group.id} value={group.id}>{group.label} · {group.members.length} rostered</option>)}</select></label>
        {selectedGroup ? <p className="text-[11px] text-[var(--gray-500)]">Every scenario uses the same {selectedGroup.members.length} roster members and the same profile snapshots loaded for this page. No group comparison is persisted.</p> : null}
      </Panel>

      <Panel className="mb-4 !p-4 space-y-2">
        <label className="block space-y-1.5"><span className="label-xs">Soldier baseline</span><select value={soldierId} onChange={(e) => { setSoldierId(e.target.value); setCompared(false); }} className={inputClass}><option value="">Generic prototype baseline</option>{soldiers.map((s) => <option key={s.id} value={s.id}>{s.soldierCode}</option>)}</select></label>
        <p className="text-[11px] text-[var(--gray-500)]">{chosenSoldier ? `${chosenSoldier.soldierCode}: mobility ${chosenSoldier.baselineMobility}, endurance ${chosenSoldier.baselineEndurance}, strength ${chosenSoldier.baselineStrength}, recovery ${chosenSoldier.baselineRecovery}, experience ${chosenSoldier.experienceYears} y. Used for both scenarios.` : initialScenarioName && initialSoldierId ? `Scenario ${initialScenarioName} is loaded; its soldier baseline is shown only if that soldier remains available.` : "No soldier selected; the engine's generic prototype baseline is used."} {initialScenarioName ? `Loaded mission: ${initialScenarioName}.` : "No saved scenario was selected; synthetic demo conditions are shown."}</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScenarioPanel title="BASELINE" badge="REFERENCE" values={baseline} onChange={updateBaseline} />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="label-xs">ALTERNATIVE SCENARIOS</div><p className="mt-1 text-[11px] text-[var(--gray-500)]">Each alternative is compared with the same baseline. Maximum {MAX_VARIATIONS} alternatives.</p></div><Button onClick={addVariation} disabled={alternatives.length >= MAX_VARIATIONS} variant="secondary" size="sm">Duplicate baseline</Button></div>
          {alternatives.map((alternative, index) => <div key={alternative.id} className="space-y-2"><Panel className="!p-3"><div className="flex flex-wrap items-end gap-2"><label className="min-w-[180px] flex-1 space-y-1"><span className="label-xs">Variation name</span><input value={alternative.name} onChange={(event) => { setAlternatives((items) => items.map((item) => item.id === alternative.id ? { ...item, name: event.target.value } : item)); setCompared(false); }} className={inputClass} maxLength={80} /></label><Button onClick={() => duplicateVariation(alternative)} disabled={alternatives.length >= MAX_VARIATIONS} variant="ghost" size="sm">Duplicate</Button><Button onClick={() => removeVariation(alternative.id)} variant="ghost" size="sm" aria-label={`Remove ${alternative.name}`}>Remove</Button></div></Panel><ScenarioPanel title={alternative.name || `Alternative ${index + 1}`} badge={`VARIANT ${index + 1}`} values={alternative.inputs} onChange={(next) => updateVariation(alternative.id, next)} /></div>)}
          {alternatives.length === 0 ? <Panel className="!p-5 text-[12px] text-[var(--gray-500)]">Add an alternative to run a stress comparison.</Panel> : null}
        </div>
      </div>

      <Panel className="mt-4 !p-4">
        <SectionHeader title="Terrain previews" subtitle="Schematic terrain follows each scenario’s selected category; route surfaces are not geographic data." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div><div className="mb-1 label-xs">BASELINE · {terrainLabel(baseline.terrainType)}</div><div className="h-48 overflow-hidden rounded border border-[var(--border)]"><MissionTerrain progress={0.42} terrainType={baseline.terrainType} distanceKm={baseline.distanceKm} altitudeMeters={baseline.altitudeMeters} viewType="TOPOGRAPHIC" className="h-full w-full" /></div></div>
          {alternatives.map((variation) => <div key={`terrain-${variation.id}`}><div className="mb-1 label-xs">{variation.name || "ALTERNATIVE"} · {terrainLabel(variation.inputs.terrainType)}</div><div className="h-48 overflow-hidden rounded border border-[var(--border)]"><MissionTerrain progress={0.42} terrainType={variation.inputs.terrainType} distanceKm={variation.inputs.distanceKm} altitudeMeters={variation.inputs.altitudeMeters} viewType="TOPOGRAPHIC" className="h-full w-full" /></div></div>)}
        </div>
      </Panel>

      <div className="mt-4 flex justify-center">
        <Button onClick={runCompare} className="min-w-[220px]" disabled={!alternatives.length}>
          Run Stress Comparison · {alternatives.length} alternatives
        </Button>
      </div>

      {compared && groupComparison ? (
        <Panel className="mt-6 !p-5 space-y-4">
          <SectionHeader title={`Group What-If · ${selectedGroup?.label ?? "Roster"}`} subtitle="Paired mission runs on identical member baseline snapshots" action={<StatusBadge tone="cyan">NOT PERSISTED</StatusBadge>} />
          <p className="text-[11px] leading-relaxed text-[var(--gray-300)]">Across {groupComparison.baseline.includedCount} modeled members, mean performance changed from {groupComparison.baseline.aggregate.performance.mean ?? "—"} to {groupComparison.modified.aggregate.performance.mean ?? "—"}; mean fatigue changed from {groupComparison.baseline.aggregate.fatigue.mean ?? "—"} to {groupComparison.modified.aggregate.fatigue.mean ?? "—"}. Each variation reruns the same member baselines with its displayed input changes. These are model indices, not measurements or suitability rankings.</p>
          <div className="flex flex-wrap gap-1">{METRICS.map((metricName) => <button key={metricName} type="button" onClick={() => setMetric(metricName)} className={cn("rounded-[4px] border px-2 py-1 text-[10px] font-medium uppercase tracking-wide", metric === metricName ? "border-[var(--cyan)]/40 bg-[var(--cyan-dim)] text-[var(--cyan)]" : "border-[var(--border)] text-[var(--gray-500)]")}>{metricName}</button>)}</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(["performance", "fatigue", "mobility", "endurance"] as const).map((metricName) => {
            const a = groupComparison.baseline.aggregate[metricName]; const b = groupComparison.modified.aggregate[metricName];
            return <div key={metricName} className="rounded border border-[var(--border)] bg-[#090f1b] p-3"><div className="label-xs">{metricName}</div><div className="mono text-[11px] text-[var(--gray-300)]">Mean {a.mean ?? "—"} → {b.mean ?? "—"}</div><div className="mono text-[10px] text-[var(--gray-500)]">Median {a.median ?? "—"} → {b.median ?? "—"} · ranges {a.minimum ?? "—"}–{a.maximum ?? "—"} → {b.minimum ?? "—"}–{b.maximum ?? "—"}</div></div>;
          })}</div>
          <div className="max-h-72 overflow-auto"><table className="w-full text-left text-[11px]"><thead className="text-[var(--gray-500)]"><tr><th>Soldier</th><th>Profile</th><th>Performance A → B</th><th>Fatigue A → B</th><th>Timeline points</th></tr></thead><tbody>{groupComparison.baseline.members.map((member, index) => { const next = groupComparison.modified.members[index]!; return <tr key={member.id} className="border-t border-[var(--border)]"><td className="py-1.5"><a className="text-[var(--cyan)] hover:underline" href={`/soldiers/${member.id}`}>{member.soldierCode}</a></td><td>{member.profileQuality.replaceAll("_", " ")}</td><td>{member.final?.performance ?? "—"} → {next.final?.performance ?? "—"}</td><td>{member.final?.fatigue ?? "—"} → {next.final?.fatigue ?? "—"}</td><td>{member.timeline.length}</td></tr>; })}</tbody></table></div>
          <div className="space-y-3 border-t border-[var(--border)] pt-3"><SectionHeader title="Alternative group distributions" subtitle="Every variation uses the same roster and baseline profiles." />{groupComparison.variations.map((variation) => { const variationInputs = alternatives.find((item) => item.id === variation.id)!.inputs; return <div key={variation.id} className="overflow-x-auto"><div className="mb-1 text-[12px] font-medium text-[var(--white)]">{variation.name} · {variation.result.modelVersion}</div><table className="w-full text-left text-[10px]"><thead className="text-[var(--gray-500)]"><tr><th>Measure</th><th>Baseline mean / median / range</th><th>Alternative mean / median / range</th></tr></thead><tbody>{(["performance", "fatigue", "mobility", "endurance"] as const).map((key) => { const a = groupComparison.baseline.aggregate[key]; const b = variation.result.aggregate[key]; return <tr key={key} className="border-t border-[var(--border)]"><td className="py-1.5">{key}</td><td>{a.mean ?? "—"} / {a.median ?? "—"} / {a.minimum ?? "—"}–{a.maximum ?? "—"}</td><td>{b.mean ?? "—"} / {b.median ?? "—"} / {b.minimum ?? "—"}–{b.maximum ?? "—"}</td></tr>; })}<tr className="border-t border-[var(--border)]"><td className="py-1.5">Strength availability</td><td>{groupStrengthStats(groupComparison.baseline, baseline).label}</td><td>{groupStrengthStats(variation.result, variationInputs).label}</td></tr></tbody></table><div className="mt-1 text-[10px] text-[var(--gray-500)]">Individual final performance differences: {variation.result.members.map((member, index) => `${member.soldierCode} ${groupComparison.baseline.members[index]?.final?.performance ?? "—"}→${member.final?.performance ?? "—"}`).join(" · ") || "No included members"}</div><ComparisonChart baseline={groupComparison.baseline.timeline} modified={variation.result.timeline} baselineStrength={groupStrengthSeries(groupComparison.baseline, baseline)} modifiedStrength={groupStrengthSeries(variation.result, variationInputs)} metric={metric} height={210} /></div>; })}</div>
          <p className="text-[10px] text-[var(--gray-500)]">All individual and aggregate values are prototype estimates. The same roster and baseline snapshots are reused for every variation; no readiness cutoff is applied. Strength availability uses the model’s existing formula without changing it.</p>
        </Panel>
      ) : compared && result ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <Panel className="!p-5">
              <SectionHeader
                title={`Baseline vs ${alternatives[0]?.name ?? "alternative"}`}
                subtitle={`Final modeled indices · ${result.baseline.modelVersion}`}
                action={<StatusBadge tone="cyan">SAME MODEL</StatusBadge>}
              />
              <p className="mb-3 text-[11px] leading-relaxed text-[var(--gray-300)]">{plainInterpretation}</p>
              <div className="space-y-0 divide-y divide-[var(--border)]">
                <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr] gap-2 pb-2 text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
                  <span>Metric</span>
                  <span className="text-right">Baseline</span>
                  <span className="text-right">Modified</span>
                  <span className="text-right">Δ points / %</span>
                </div>
                {deltaRows.map((row) => (
                  <div
                    key={row.key}
                    className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr] items-center gap-2 py-2.5"
                  >
                    <span className="text-[13px] text-[var(--off-white)]">
                      {row.label}
                    </span>
                    <span className="mono tabular text-right text-[13px] text-[var(--gray-300)]">
                      {Math.round(row.a)}
                    </span>
                    <span className="mono tabular text-right text-[13px] text-[var(--white)]">
                      {Math.round(row.b)}
                    </span>
                    <span className="flex items-center justify-end gap-1"><DeltaCell value={row.delta} invert={row.key === "fatigue"} /><span className="mono text-[10px] text-[var(--gray-500)]">{row.a ? `${((row.delta / row.a) * 100).toFixed(1)}%` : "—"}</span></span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4">
                <StatValue
                  label="Baseline Index"
                  value={Math.round(result.baseline.final.performance)}
                  size="md"
                />
                <StatValue
                  label={`${alternatives[0]?.name ?? "Alternative"} index`}
                  value={Math.round(result.modified.final.performance)}
                  size="md"
                />
              </div>
            </Panel>

            <Panel className="!p-5">
              <SectionHeader
                title="Timeline Comparison"
                subtitle="Relative simulated indices across mission time"
                action={
                  <div className="flex flex-wrap gap-1">
                    {METRICS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetric(m)}
                        className={cn(
                          "rounded-[4px] border px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors",
                          metric === m
                            ? "border-[var(--cyan)]/40 bg-[var(--cyan-dim)] text-[var(--cyan)]"
                            : "border-[var(--border)] text-[var(--gray-500)] hover:border-[var(--cyan)]/30 hover:text-[var(--gray-300)]"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                }
              />
              <ComparisonChart
                baseline={result.baseline.snapshots}
                modified={result.modified.snapshots}
                baselineStrength={result.baseline.snapshots.map((point) => strengthAvailabilityAt(result.baseline.factors, result.baseline.baselineUsed, point.fatigue))}
                modifiedStrength={result.modified.snapshots.map((point) => strengthAvailabilityAt(result.modified.factors, result.modified.baselineUsed, point.fatigue))}
                metric={metric}
                height={260}
              />
              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--gray-500)]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-px w-4 border-t border-dashed border-[var(--gray-300)]"
                    aria-hidden
                  />
                  Baseline
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-4 bg-[var(--cyan)]"
                    aria-hidden
                  />
                  Modified
                </span>
              </div>
            </Panel>
          </div>

          <Panel className="!p-5">
            <SectionHeader
              title="Primary Changes"
              subtitle="Mission parameters that differ between scenarios"
            />
            {result.primaryChanges.length === 0 ? (
              <p className="text-[13px] text-[var(--gray-500)]">
                No parameter differences — scenarios are identical.
              </p>
            ) : (
              <ul className="space-y-2">
                {result.primaryChanges.map((change) => (
                  <li
                    key={change.label}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border)] py-2.5 last:border-0"
                  >
                    <span className="min-w-[100px] text-[12px] font-medium uppercase tracking-wide text-[var(--gray-500)]">
                      {change.label}
                    </span>
                    <span className="mono tabular text-[13px] text-[var(--gray-300)]">
                      {change.from}
                    </span>
                    <span className="text-[var(--cyan)]" aria-hidden>
                      →
                    </span>
                    <span className="mono tabular text-[13px] text-[var(--white)]">
                      {change.to}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] text-[var(--gray-500)]">
              Relative model output. Not a clinical measurement.
            </p>
          </Panel>
          {additionalResults.map(({ id, name, comparison }) => {
            const baseStrength = strengthAvailabilityAt(comparison.baseline.factors, comparison.baseline.baselineUsed, comparison.baseline.final.fatigue);
            const alternativeStrength = strengthAvailabilityAt(comparison.modified.factors, comparison.modified.baselineUsed, comparison.modified.final.fatigue);
            const rows = [
              ["Performance", comparison.baseline.final.performance, comparison.modified.final.performance],
              ["Fatigue", comparison.baseline.final.fatigue, comparison.modified.final.fatigue],
              ["Mobility", comparison.baseline.final.mobility, comparison.modified.final.mobility],
              ["Endurance", comparison.baseline.final.endurance, comparison.modified.final.endurance],
              ["Strength availability", baseStrength, alternativeStrength],
            ] as Array<[string, number, number]>;
            return <Panel key={id} className="!p-5 space-y-3"><SectionHeader title={name} subtitle={`Same reference baseline · ${comparison.baseline.modelVersion} / ${comparison.modified.modelVersion}`} action={<StatusBadge tone={comparison.baseline.modelVersion === comparison.modified.modelVersion ? "cyan" : "muted"}>{comparison.baseline.modelVersion === comparison.modified.modelVersion ? "MODEL MATCH" : "MODEL MISMATCH"}</StatusBadge>} /><div className="grid gap-4 lg:grid-cols-2"><div><table className="w-full text-left text-[11px]"><thead className="text-[var(--gray-500)]"><tr><th>Measure</th><th>Baseline</th><th>Alternative</th><th>Δ / relative</th></tr></thead><tbody>{rows.map(([label, base, alt]) => <tr key={label} className="border-t border-[var(--border)]"><td className="py-1.5">{label}</td><td>{base.toFixed(1)}</td><td>{alt.toFixed(1)}</td><td>{(alt - base > 0 ? "+" : "")}{(alt - base).toFixed(1)} / {base ? `${(((alt - base) / base) * 100).toFixed(1)}%` : "—"}</td></tr>)}</tbody></table><div className="mt-3 text-[10px] text-[var(--gray-500)]">Changed: {comparison.primaryChanges.map((change) => `${change.label}: ${change.from} → ${change.to}`).join(" · ") || "none"}</div></div><ComparisonChart baseline={comparison.baseline.snapshots} modified={comparison.modified.snapshots} baselineStrength={comparison.baseline.snapshots.map((point) => strengthAvailabilityAt(comparison.baseline.factors, comparison.baseline.baselineUsed, point.fatigue))} modifiedStrength={comparison.modified.snapshots.map((point) => strengthAvailabilityAt(comparison.modified.factors, comparison.modified.baselineUsed, point.fatigue))} metric={metric} height={230} /></div></Panel>;
          })}
        </div>
      ) : (
        <Panel className="mt-6 !p-8 text-center">
          <div className="label-xs mb-2">Awaiting comparison</div>
          <p className="text-[13px] text-[var(--gray-300)]">
            Adjust baseline and modified conditions, then run Compare Scenarios
            to see deltas, charts, and primary changes.
          </p>
        </Panel>
      )}
      {compared ? <div className="mt-6 space-y-3"><p className="text-[11px] text-[var(--gray-500)]">Historical matches are recalculated independently for each parameter set. A change in mission inputs can change the available evidence; this is not a prediction.</p><div className="grid gap-3 lg:grid-cols-2"><HistoricalContextPanel inputs={baseline} label="Historical context · baseline" compact />{alternatives.map((alternative) => <HistoricalContextPanel key={alternative.id} inputs={alternative.inputs} label={`Historical context · ${alternative.name}`} compact />)}</div></div> : null}
    </>
  );
}

function DeltaCell({
  value,
  invert = false,
}: {
  value: number;
  invert?: boolean;
}) {
  const rounded = Math.round(value * 10) / 10;
  const abs = Math.abs(rounded);
  const arrow =
    rounded === 0 ? "·" : rounded > 0 ? "↑" : "↓";
  // For fatigue, lower is typically preferable; keep typography neutral (no green/red).
  const tone =
    rounded === 0
      ? "text-[var(--gray-500)]"
      : invert
        ? rounded < 0
          ? "text-[var(--cyan)]"
          : "text-[var(--gray-100)]"
        : rounded > 0
          ? "text-[var(--cyan)]"
          : "text-[var(--gray-100)]";

  return (
    <span
      className={cn(
        "mono tabular text-right text-[13px] font-medium",
        tone
      )}
    >
      {arrow} {rounded > 0 ? "+" : ""}
      {abs === 0 ? "0" : rounded}
    </span>
  );
}

function ScenarioPanel({
  title,
  badge,
  values,
  onChange,
}: {
  title: string;
  badge: string;
  values: MissionInputs;
  onChange: (next: MissionInputs) => void;
}) {
  function patch(partial: Partial<MissionInputs>) {
    onChange({ ...values, ...partial });
  }

  return (
    <Panel className="!p-5 space-y-5">
      <SectionHeader
        title={title}
        subtitle={`${terrainLabel(values.terrainType)} · ${values.timeOfDay} · ${formatHoursLabel(values.durationMinutes)}`}
        action={<StatusBadge tone="cyan">{badge}</StatusBadge>}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="label-xs">Terrain</span>
          <select
            value={values.terrainType}
            onChange={(e) =>
              patch({ terrainType: e.target.value as TerrainType })
            }
            className={inputClass}
          >
            {TERRAIN.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="space-y-1.5">
          <legend className="label-xs">Time of day</legend>
          <div className="flex gap-2">
            {(["DAY", "NIGHT"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => patch({ timeOfDay: t as TimeOfDay })}
                className={cn(
                  "h-9 flex-1 rounded-[6px] border text-[12px] font-medium tracking-wide transition-colors",
                  values.timeOfDay === t
                    ? "border-[var(--cyan)]/40 bg-[var(--cyan-dim)] text-[var(--cyan)]"
                    : "border-[var(--border-strong)] text-[var(--gray-300)] hover:border-[var(--cyan)]/30"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SliderField
          label="Load"
          value={values.loadKg}
          min={5}
          max={40}
          step={0.5}
          unit="kg"
          onChange={(v) => patch({ loadKg: v })}
        />
        <SliderField
          label="Altitude"
          value={values.altitudeMeters}
          min={0}
          max={6000}
          step={50}
          unit="m"
          onChange={(v) => patch({ altitudeMeters: v })}
        />
        <SliderField
          label="Temperature"
          value={values.temperatureCelsius}
          min={-30}
          max={45}
          step={1}
          unit="°C"
          onChange={(v) => patch({ temperatureCelsius: v })}
        />
        <SliderField
          label="Duration"
          value={values.durationMinutes}
          min={30}
          max={840}
          step={15}
          onChange={(v) => patch({ durationMinutes: v })}
          formatValue={(v) => formatHoursLabel(v)}
        />
        <SliderField
          label="Rest"
          value={values.restMinutes}
          min={0}
          max={120}
          step={5}
          unit="min"
          onChange={(v) => patch({ restMinutes: v })}
        />
        <SliderField
          label="Distance"
          value={values.distanceKm}
          min={1}
          max={40}
          step={0.5}
          unit="km"
          onChange={(v) => patch({ distanceKm: v })}
        />
      </div>
    </Panel>
  );
}

function groupStrengthStats(group: ReturnType<typeof simulateRoster>, inputs: MissionInputs) {
  const factors = normalizeFactors(inputs);
  const values = group.members.flatMap((member) => member.included && member.baseline && member.final
    ? [strengthAvailabilityAt(factors, member.baseline, member.final.fatigue)]
    : []).sort((a, b) => a - b);
  if (!values.length) return { label: "No included members" };
  const middle = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { label: `mean ${mean.toFixed(1)} · median ${median.toFixed(1)} · range ${values[0]!.toFixed(1)}–${values.at(-1)!.toFixed(1)}` };
}

function groupStrengthSeries(group: ReturnType<typeof simulateRoster>, inputs: MissionInputs) {
  const factors = normalizeFactors(inputs);
  return group.timeline.map((_, index) => {
    const strengths = group.members.flatMap((member) => member.included && member.baseline && member.timeline[index]
      ? [strengthAvailabilityAt(factors, member.baseline, member.timeline[index]!.fatigue)]
      : []);
    return strengths.length ? strengths.reduce((sum, value) => sum + value, 0) / strengths.length : 0;
  });
}
