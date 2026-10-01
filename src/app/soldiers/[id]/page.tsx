import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  PageHeader,
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { SoldierHeroVisual } from "@/components/soldier/SoldierHeroVisual";
import { BaselineRadarChart } from "@/components/soldier/BaselineRadarChart";
import { SimulationDeltaModule } from "@/components/soldier/SimulationDeltaModule";
import { SimulationHistoryList } from "@/components/soldier/SimulationHistoryList";
import { SimulationChart } from "@/components/charts/SimulationChart";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SoldierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const soldier = await prisma.soldier.findUnique({
    where: { id },
    include: {
      role: {
        include: {
          squad: { include: { unit: true } },
        },
      },
      missionRuns: {
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          scenario: true,
          snapshots: { orderBy: { timeMinutes: "asc" } },
        },
      },
    },
  });

  if (!soldier) notFound();

  const baselineIndex = Math.round(
    (soldier.baselineMobility +
      soldier.baselineEndurance +
      soldier.baselineStrength +
      soldier.baselineRecovery) /
      4
  );

  const latestRun = soldier.missionRuns[0];
  const latestSnapshots = latestRun?.snapshots ?? [];

  return (
    <AppShell
      title={`Soldiers · Profile · ${soldier.soldierCode}`}
      meta={
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] text-[var(--gray-300)]">
            ANALYTICAL PROFILE
          </span>
          <StatusBadge tone="cyan">{soldier.status}</StatusBadge>
        </div>
      }
    >
      {/* 1. HEADER */}
      <PageHeader
        eyebrow="SOLDIER PROFILE"
        title={soldier.soldierCode}
        description={`${soldier.role.name} · ${soldier.role.squad.name} · ${soldier.role.squad.unit.name}`}
        actions={
          <>
            <Button href="/soldiers" variant="secondary" size="sm">
              Back to Library
            </Button>
            <Button href={`/missions/new?soldierId=${soldier.id}`} size="sm">
              Simulate This Soldier
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {/* 2. HERO SECTION: REALISTIC SOLDIER VISUAL (~40%) + HUMAN PERFORMANCE INTELLIGENCE (~60%) */}
        <div className="grid gap-5 xl:grid-cols-[1.1fr_1.4fr]">
          {/* LEFT: HERO SOLDIER VISUAL */}
          <SoldierHeroVisual
            soldierCode={soldier.soldierCode}
            roleName={soldier.role.name}
            squadName={soldier.role.squad.name}
            unitName={soldier.role.squad.unit.name}
            experienceYears={soldier.experienceYears}
            typicalLoadKg={soldier.typicalLoadKg}
          />

          {/* RIGHT: HUMAN PERFORMANCE & BASELINE INTELLIGENCE */}
          <Panel className="!p-0 border-[var(--border)] overflow-hidden flex flex-col justify-between relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#09111f] to-transparent pointer-events-none" />
            
            <div className="relative p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-[var(--cyan)] rounded-full animate-pulse shadow-[0_0_8px_rgba(85,216,245,0.6)]" />
                    <div className="label-xs text-[var(--cyan)] tracking-widest">CAPACITY ENGINE</div>
                  </div>
                  <h2 className="text-[18px] font-semibold text-[var(--white)] tracking-tight">
                    HUMAN PERFORMANCE PROFILE
                  </h2>
                </div>
                <StatusBadge tone="cyan">BASELINE MODEL</StatusBadge>
              </div>

              {/* 4 Performance Metric Bars */}
              <div className="space-y-4">
                <MetricBarRow
                  label="MOBILITY BASELINE"
                  value={soldier.baselineMobility}
                  sub="Agility, sprint burst & joint resilience"
                />
                <MetricBarRow
                  label="ENDURANCE BASELINE"
                  value={soldier.baselineEndurance}
                  sub="Stamina, aerobic capacity & sustained output"
                />
                <MetricBarRow
                  label="STRENGTH BASELINE"
                  value={soldier.baselineStrength}
                  sub="Load tolerance & muscular force"
                />
                <MetricBarRow
                  label="RECOVERY BASELINE"
                  value={soldier.baselineRecovery}
                  sub="Metabolic reset rate & sleep efficiency"
                />
              </div>
            </div>

            {/* Radar Capability Polygon & Composite Index */}
            <div className="relative bg-[#060b14] border-t border-[var(--border)]/60 p-5 flex flex-col sm:flex-row items-center justify-around gap-6">
              <BaselineRadarChart
                mobility={soldier.baselineMobility}
                endurance={soldier.baselineEndurance}
                strength={soldier.baselineStrength}
                recovery={soldier.baselineRecovery}
                compositeIndex={baselineIndex}
                size={220}
              />
              <div className="space-y-3 max-w-[220px] text-center sm:text-left">
                <div className="mono text-[11px] text-[var(--cyan)] uppercase font-semibold tracking-wider">
                  PROTOTYPE RELATIVE MODEL
                </div>
                <p className="text-[12px] text-[var(--gray-300)] leading-relaxed">
                  Composite index is derived from the four baseline capability axes. Serves as relative input for deterministic mission simulation models.
                </p>
                <div className="inline-block mt-1 rounded bg-[var(--gray-900)] px-2 py-1 text-[9px] mono text-[var(--gray-500)] border border-[var(--border)]">
                  NON-CLINICAL ASSESSMENT
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* 3. BASELINE vs LATEST SIMULATED STATE DELTA */}
        <SimulationDeltaModule
          baselineIndex={baselineIndex}
          latestPerformance={latestRun?.finalPerformance ?? 28}
          latestFatigue={latestRun?.finalFatigue ?? 100}
          scenarioName={latestRun?.scenario.name ?? "S-107 Mission Profile"}
          terrainType={latestRun?.scenario.terrainType ?? "Mountain"}
          altitudeMeters={latestRun?.scenario.altitudeMeters ?? 3500}
          loadKg={latestRun?.scenario.loadKg ?? 18}
          durationMinutes={latestRun?.scenario.durationMinutes ?? 360}
        />

        {/* 4. PERFORMANCE THROUGH MISSION TIMELINE (IF SIMULATION RUNS EXIST) */}
        {latestRun && latestSnapshots.length > 0 && (
          <Panel className="!p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div>
                <div className="label-xs text-[var(--cyan)]">DYNAMIC HUMAN RESPONSE</div>
                <h3 className="text-[16px] font-semibold text-[var(--white)]">
                  PERFORMANCE OVER TIME ({latestRun.scenario.name.toUpperCase()})
                </h3>
                <p className="text-[12px] text-[var(--gray-300)]">
                  Relative simulated indices across mission time for the latest simulation run
                </p>
              </div>
              <StatusBadge tone="cyan">LATEST SIMULATION TRAJECTORY</StatusBadge>
            </div>

            <SimulationChart
              data={latestSnapshots.map((s) => ({
                timeMinutes: s.timeMinutes,
                fatigue: s.fatigue,
                mobility: s.mobility,
                endurance: s.endurance,
                performance: s.performance,
              }))}
              height={280}
            />
          </Panel>
        )}

        {/* 5. SIMULATION HISTORY */}
        <SimulationHistoryList
          runs={soldier.missionRuns}
          soldierId={soldier.id}
        />
      </div>
    </AppShell>
  );
}

function MetricBarRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-1.5">
        <div>
          <div className="font-mono text-[10px] text-[var(--gray-300)] uppercase tracking-wider group-hover:text-[var(--white)] transition-colors">{label}</div>
          <div className="text-[9px] text-[var(--gray-500)] mt-0.5">{sub}</div>
        </div>
        <div className="mono tabular text-[var(--cyan)] font-bold text-[15px] drop-shadow-[0_0_8px_rgba(85,216,245,0.4)]">{value}</div>
      </div>
      <div className="h-[4px] w-full bg-[var(--gray-800)] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--cyan-dim)] to-[var(--cyan)] transition-all duration-700 ease-out shadow-[0_0_10px_rgba(85,216,245,0.5)]"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
