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
import { compareScenarios } from "@/lib/simulation";
import type {
  MissionInputs,
  ScenarioComparisonResult,
  TerrainType,
  TimeOfDay,
} from "@/lib/simulation";
import { terrainLabel } from "@/lib/simulation/factors";
import { cn, formatHoursLabel } from "@/lib/utils";

const TERRAIN: TerrainType[] = [
  "FLAT",
  "ROLLING",
  "MOUNTAIN",
  "STEEP_MOUNTAIN",
  "MIXED",
];

const METRICS = ["performance", "fatigue", "mobility", "endurance"] as const;
type Metric = (typeof METRICS)[number];

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

const DEFAULT_B: MissionInputs = {
  ...DEFAULT_A,
  loadKg: 14,
  restMinutes: 30,
};

export function WhatIfClient() {
  const [baseline, setBaseline] = useState<MissionInputs>(DEFAULT_A);
  const [modified, setModified] = useState<MissionInputs>(DEFAULT_B);
  const [result, setResult] = useState<ScenarioComparisonResult | null>(null);
  const [metric, setMetric] = useState<Metric>("performance");
  const [compared, setCompared] = useState(false);

  function runCompare() {
    const comparison = compareScenarios(baseline, modified);
    setResult(comparison);
    setCompared(true);
  }

  const deltaRows = useMemo(() => {
    if (!result) return [];
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
    ];
  }, [result]);

  return (
    <>
      <PageHeader
        eyebrow="Scenario Comparison"
        title="WHAT-IF SIMULATION"
        description="Change the mission. See how the simulated human state changes."
        actions={
          <Button onClick={runCompare} size="sm">
            Compare Scenarios
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ScenarioPanel
          title="BASELINE"
          badge="SCENARIO A"
          values={baseline}
          onChange={setBaseline}
        />
        <ScenarioPanel
          title="MODIFIED"
          badge="SCENARIO B"
          values={modified}
          onChange={setModified}
        />
      </div>

      <div className="mt-4 flex justify-center">
        <Button onClick={runCompare} className="min-w-[220px]">
          Compare Scenarios
        </Button>
      </div>

      {compared && result ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <Panel className="!p-5">
              <SectionHeader
                title="Comparison Matrix"
                subtitle="Final relative indices — baseline vs modified"
                action={<StatusBadge tone="cyan">COMPARED</StatusBadge>}
              />
              <div className="space-y-0 divide-y divide-[var(--border)]">
                <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr] gap-2 pb-2 text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
                  <span>Metric</span>
                  <span className="text-right">Baseline</span>
                  <span className="text-right">Modified</span>
                  <span className="text-right">Delta</span>
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
                    <DeltaCell value={row.delta} invert={row.key === "fatigue"} />
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
                  label="Modified Index"
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
