"use client";

import React from "react";
import { ArrowRight, Zap, TrendingDown, Layers, Compass, Thermometer, Clock } from "lucide-react";
import { Panel, StatusBadge } from "@/components/ui/primitives";

interface SimulationDeltaModuleProps {
  baselineIndex: number;
  latestPerformance?: number;
  latestFatigue?: number;
  scenarioName?: string;
  terrainType?: string;
  altitudeMeters?: number;
  loadKg?: number;
  durationMinutes?: number;
  className?: string;
}

export function SimulationDeltaModule({
  baselineIndex,
  latestPerformance = 28,
  latestFatigue = 100,
  scenarioName = "S-107 Mission Profile",
  terrainType = "Mountain",
  altitudeMeters = 3500,
  loadKg = 18,
  durationMinutes = 360,
  className = "",
}: SimulationDeltaModuleProps) {
  const delta = Math.round(latestPerformance - baselineIndex);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. BASELINE → SIMULATED DELTA CARD */}
      <Panel className="!p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <div className="label-xs text-[var(--cyan)]">SIMULATION DELTA ANALYSIS</div>
            <h3 className="text-[16px] font-semibold text-[var(--white)]">
              BASELINE → SIMULATED RESPONSE
            </h3>
          </div>
          <StatusBadge tone="cyan">MODEL RESPONSE</StatusBadge>
        </div>

        {/* Visual Flow Connector Card */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 bg-[#090f1b] p-4 rounded border border-[var(--border)]">
          {/* Baseline State */}
          <div className="text-center md:text-left space-y-1">
            <div className="text-[10px] font-mono uppercase text-[var(--gray-500)] tracking-wider">
              BASELINE PROFILE
            </div>
            <div className="mono tabular text-4xl font-bold text-[var(--white)]">
              {baselineIndex}
            </div>
            <div className="text-[11px] text-[var(--gray-500)]">Pre-mission capacity</div>
          </div>

          <ArrowRight className="mx-auto h-5 w-5 text-[var(--cyan)] hidden md:block shrink-0" />

          {/* Mission Conditions Summary */}
          <div className="text-center space-y-1 border-y md:border-y-0 md:border-x border-[var(--border)]/60 py-2 md:py-0 md:px-4">
            <div className="text-[10px] font-mono uppercase text-[var(--cyan)] tracking-wider">
              MISSION SCENARIO
            </div>
            <div className="text-[13px] font-semibold text-[var(--white)] truncate max-w-[180px] mx-auto">
              {scenarioName}
            </div>
            <div className="mono text-[10px] text-[var(--gray-300)]">
              {terrainType} · {altitudeMeters}m · {loadKg}kg
            </div>
          </div>

          <ArrowRight className="mx-auto h-5 w-5 text-[var(--cyan)] hidden md:block shrink-0" />

          {/* Simulated State */}
          <div className="text-center md:text-right space-y-1">
            <div className="text-[10px] font-mono uppercase text-[var(--cyan)] tracking-wider">
              SIMULATED STATE
            </div>
            <div className="mono tabular text-4xl font-bold text-[var(--cyan)]">
              {Math.round(latestPerformance)}
            </div>
            <div className="mono text-[11px] text-[var(--gray-300)] flex items-center justify-center md:justify-end gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-[var(--cyan)]" />
              <span>DELTA {delta}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[var(--gray-500)]">
          Simulated relative model output under mission stress. Indicates performance degradation relative to baseline.
        </p>
      </Panel>

      {/* 2. WHAT CHANGED? INFLUENCE BREAKDOWN */}
      <Panel className="!p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <div className="label-xs text-[var(--cyan)]">SCENARIO INFLUENCE</div>
            <h3 className="text-[15px] font-semibold text-[var(--white)]">
              WHAT CHANGED?
            </h3>
          </div>
          <StatusBadge tone="muted">ENVIRONMENTAL STRESS</StatusBadge>
        </div>

        {/* Condition Chips */}
        <div className="flex flex-wrap gap-2 text-[11px] mono">
          <ConditionTag icon={<Layers size={12} />} label="LOAD" val={`${loadKg} KG`} />
          <ConditionTag icon={<Compass size={12} />} label="ALTITUDE" val={`${altitudeMeters} M`} />
          <ConditionTag icon={<Thermometer size={12} />} label="TERRAIN" val={terrainType} />
          <ConditionTag icon={<Clock size={12} />} label="DURATION" val={`${durationMinutes / 60} H`} />
        </div>

        {/* Simulated Impact List */}
        <div className="space-y-2.5 rounded bg-[#090f1b] p-3.5 border border-[var(--border)] text-[12px]">
          <div className="mono text-[10px] uppercase font-semibold text-[var(--cyan)] tracking-wider">
            SIMULATED HUMAN IMPACT
          </div>
          <ImpactRow label="Fatigue Accumulation" val={`+${latestFatigue}%`} note="Increased metabolic workload" />
          <ImpactRow label="Mobility Index" val="36 / 100" note="Heavy load incline impact" />
          <ImpactRow label="Endurance Reserve" val="30 / 100" note="Prolonged 6h exposure" />
        </div>

        <div className="rounded bg-[#080e19] p-3 border border-[var(--border)] text-[11px] text-[var(--gray-300)] flex items-center gap-2">
          <Zap className="h-4 w-4 text-[var(--cyan)] shrink-0" />
          <span>
            Higher load, prolonged duration and limited recovery increase simulated fatigue.
          </span>
        </div>
      </Panel>
    </div>
  );
}

function ConditionTag({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded bg-[#090f1b] px-2.5 py-1 border border-[var(--border)] text-[var(--gray-300)]">
      <span className="text-[var(--cyan)]">{icon}</span>
      <span className="text-[var(--gray-500)]">{label}:</span>
      <span className="font-semibold text-[var(--white)]">{val}</span>
    </div>
  );
}

function ImpactRow({ label, val, note }: { label: string; val: string; note: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)]/50 pb-2 last:border-0 last:pb-0 text-[11px]">
      <span className="text-[var(--white)] font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-[var(--gray-500)] text-[10px] hidden sm:inline">{note}</span>
        <span className="mono tabular font-semibold text-[var(--cyan)]">{val}</span>
      </div>
    </div>
  );
}
