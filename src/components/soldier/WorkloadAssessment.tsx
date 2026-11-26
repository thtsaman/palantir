"use client";

import { useState } from "react";
import { assessWorkload } from "@/lib/soldier-intelligence";
import type { MissionInputs, SoldierBaseline } from "@/lib/simulation/types";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { SliderField } from "@/components/ui/SliderField";

export function WorkloadAssessment({ baseline }: { baseline: SoldierBaseline }) {
  const [loadKg, setLoadKg] = useState(baseline.typicalLoadKg);
  const inputs: Omit<MissionInputs, "loadKg"> & { loadKg: number } = {
    terrainType: "MOUNTAIN",
    altitudeMeters: 0,
    temperatureCelsius: 15,
    distanceKm: 12,
    durationMinutes: 360,
    restMinutes: 20,
    timeOfDay: "DAY",
    loadKg,
  };
  const result = assessWorkload(baseline, inputs);

  return (
    <Panel className="!p-5 space-y-5">
      <SectionHeader title="Workload response" subtitle="Compare an assumed carried load with the recorded typical load" action={<StatusBadge tone="muted">PROTOTYPE MODEL</StatusBadge>} />
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.7fr)_1.3fr]">
        <div className="space-y-4">
          <SliderField label="Assumed carried load" value={loadKg} min={0} max={50} step={0.5} unit="kg" onChange={setLoadKg} />
          <p className="text-[12px] text-[var(--gray-500)]">Reference load: <span className="mono text-[var(--off-white)]">{baseline.typicalLoadKg} kg</span>. This is not a safe maximum or a deployment recommendation.</p>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="INPUT LOAD" value={`${loadKg} kg`} />
            <Metric label="FATIGUE CHANGE" value={signed(result.changes.fatigue)} />
            <Metric label="MOBILITY CHANGE" value={signed(result.changes.mobility)} />
            <Metric label="ENDURANCE CHANGE" value={signed(result.changes.endurance)} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-3">
            <Estimate label="Fatigue estimate" value={result.requested.final.fatigue} />
            <Estimate label="Mobility estimate" value={result.requested.final.mobility} />
            <Estimate label="Endurance estimate" value={result.requested.final.endurance} />
          </div>
          <div className="mt-4 border-l-2 border-[var(--cyan)]/50 pl-3 text-[12px] leading-relaxed text-[var(--gray-300)]">
            <p>Relative difference from the typical-load reference under fixed illustrative conditions: mountain terrain, 12 km, 6 hours, 20 minutes rest, 15°C, daytime.</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--gray-500)]">{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="mt-2">Outputs are not medically validated predictions and must be interpreted by a human reviewer.</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border-l border-[var(--border)] pl-3"><div className="label-xs">{label}</div><div className="mono tabular mt-1 text-[18px] text-[var(--cyan)]">{value}</div></div>;
}

function Estimate({ label, value }: { label: string; value: number }) {
  return <div><div className="label-xs">{label}</div><div className="mono tabular mt-1 text-[15px] text-[var(--off-white)]">{value.toFixed(1)} / 100</div></div>;
}
