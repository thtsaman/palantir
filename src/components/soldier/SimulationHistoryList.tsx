"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { terrainLabel } from "@/lib/simulation/factors";
import { formatHoursLabel } from "@/lib/utils";
import { ChevronDown, ChevronUp, Play, History, Activity } from "lucide-react";

export interface MissionRunRecord {
  id: string;
  createdAt: Date | string;
  status: string;
  finalPerformance: number | null;
  finalFatigue: number | null;
  finalMobility: number | null;
  finalEndurance: number | null;
  scenarioId: string;
  scenario: {
    id: string;
    name: string;
    terrainType: string;
    durationMinutes: number;
    loadKg: number;
    altitudeMeters: number;
  };
}

interface SimulationHistoryListProps {
  runs: MissionRunRecord[];
  soldierId: string;
  className?: string;
}

export function SimulationHistoryList({
  runs,
  soldierId,
  className = "",
}: SimulationHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <Panel className={`!p-6 text-center space-y-3 ${className}`}>
        <History className="mx-auto h-8 w-8 text-[var(--gray-700)]" />
        <div className="text-[14px] font-semibold text-[var(--white)]">
          NO SIMULATION HISTORY RECORDED
        </div>
        <p className="text-[12px] text-[var(--gray-500)] max-w-[320px] mx-auto">
          No mission runs have been executed for this profile. Configure a scenario to start testing performance response.
        </p>
        <div className="pt-2">
          <Button href={`/missions/new?soldierId=${soldierId}`} size="sm">
            Simulate This Soldier
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <SectionHeader
        title="SIMULATION HISTORY"
        subtitle="Prior mission configurations executed against this profile"
        action={<StatusBadge tone="muted">{runs.length} RUNS</StatusBadge>}
      />

      <div className="space-y-2">
        {runs.map((run) => {
          const isExpanded = expandedId === run.id;
          const perf = Math.round(run.finalPerformance ?? 0);
          const fatigue = Math.round(run.finalFatigue ?? 0);
          const formattedDate = new Date(run.createdAt)
            .toISOString()
            .slice(0, 16)
            .replace("T", " ");

          return (
            <Panel
              key={run.id}
              padded={false}
              className={`overflow-hidden transition-colors ${
                isExpanded ? "border-[var(--cyan)]/40 bg-[#0c1626]" : ""
              }`}
            >
              {/* Main Summary Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px]">
                {/* Scenario & Date */}
                <div className="min-w-[200px]">
                  <Link
                    href={`/simulator/${run.scenarioId}`}
                    className="font-semibold text-[var(--white)] hover:text-[var(--cyan)] flex items-center gap-1.5"
                  >
                    <span>{run.scenario.name}</span>
                  </Link>
                  <div className="mono text-[10px] text-[var(--gray-500)] mt-0.5">
                    {formattedDate}
                  </div>
                </div>

                {/* Key Conditions Tag */}
                <div className="mono text-[11px] text-[var(--gray-300)] bg-[#090f1b] px-2.5 py-1 rounded border border-[var(--border)]">
                  {terrainLabel(run.scenario.terrainType as any)} · {formatHoursLabel(run.scenario.durationMinutes)} · {run.scenario.loadKg}kg
                </div>

                {/* Mini Sparkline */}
                <div className="hidden sm:block">
                  <SparklineVisual value={perf} />
                </div>

                {/* Performance & Fatigue Index */}
                <div className="flex items-center gap-4 mono text-[12px]">
                  <div>
                    <span className="text-[9px] uppercase text-[var(--gray-500)] block">PERF</span>
                    <span className="font-semibold text-[var(--cyan)] tabular">{perf}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-[var(--gray-500)] block">FATIGUE</span>
                    <span className="font-semibold text-[var(--white)] tabular">{fatigue}</span>
                  </div>
                </div>

                {/* Actions & Expand */}
                <div className="flex items-center gap-2">
                  <StatusBadge tone={run.status === "COMPLETED" ? "cyan" : "neutral"}>
                    {run.status}
                  </StatusBadge>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : run.id)}
                    className="p-1 text-[var(--gray-500)] hover:text-[var(--cyan)]"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expandable Run Details */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] bg-[#080e19] px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] mono">
                    <div>
                      <span className="text-[9px] uppercase text-[var(--gray-500)] block">ALTITUDE</span>
                      <span className="text-[var(--white)] font-semibold">{run.scenario.altitudeMeters} m</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-[var(--gray-500)] block">FINAL MOBILITY</span>
                      <span className="text-[var(--white)] font-semibold">{Math.round(run.finalMobility ?? 0)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-[var(--gray-500)] block">FINAL ENDURANCE</span>
                      <span className="text-[var(--white)] font-semibold">{Math.round(run.finalEndurance ?? 0)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-[var(--gray-500)] block">FATIGUE INDEX</span>
                      <span className="text-[var(--cyan)] font-semibold">{fatigue} / 100</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button href={`/simulator/${run.scenarioId}`} size="sm">
                      <Play size={12} className="mr-1.5 shrink-0" /> VIEW SIMULATION
                    </Button>
                  </div>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function SparklineVisual({ value }: { value: number }) {
  // Generate 6 simulated trajectory points ending at value
  const points = [
    Math.min(95, value + 25),
    Math.min(90, value + 18),
    Math.min(85, value + 12),
    Math.min(80, value + 8),
    Math.min(75, value + 4),
    value,
  ];

  const min = Math.min(...points, 0);
  const max = 100;
  const h = 20;
  const w = 60;

  const pts = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex items-center gap-1">
      <svg width={w} height={h} className="overflow-visible select-none">
        <polyline
          points={pts}
          fill="none"
          stroke="#55D8F5"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
