import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/ui/primitives";
import { SimulationChart } from "@/components/charts/SimulationChart";
import { MissionRoutePreview } from "@/components/charts/MissionRoutePreview";
import { ReadinessGauge } from "@/components/ui/ReadinessGauge";
import { prisma } from "@/lib/prisma";
import { normalizeFactors, terrainLabel } from "@/lib/simulation/factors";
import Link from "next/link";
import {
  Clock,
  Compass,
  Thermometer,
  ShieldAlert,
  ArrowRight,
  Layers,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [recentScenarios, recentRuns, completedRunCount, approvedOperationCount, soldierCount, unitCount, scenarioCount, approvedLessonCount, unknownProfileCount, groupRunCount] = await Promise.all([
    prisma.missionScenario.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        runs: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { snapshots: { orderBy: { timeMinutes: "asc" } } },
        },
      },
    }),
    prisma.missionRun.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { scenario: true, soldier: true },
    }),
    prisma.missionRun.count({ where: { status: "COMPLETED" } }),
    prisma.historicalOperation.count({ where: { workflowStatus: "APPROVED" } }),
    prisma.soldier.count(),
    prisma.unit.count(),
    prisma.missionScenario.count(),
    prisma.operationLesson.count({ where: { reviewStatus: "APPROVED", operation: { workflowStatus: "APPROVED" } } }),
    prisma.soldier.count({ where: { profileProvenance: null } }),
    prisma.groupSimulationRun.count(),
  ]);

  const activeScenario = recentScenarios.find((scenario) => scenario.runs.length > 0) ?? recentScenarios[0];
  const run = activeScenario?.runs?.[0];
  const snaps = run?.snapshots ?? [];

  const final = run
    ? {
        fatigue: run.finalFatigue === null ? null : Math.round(run.finalFatigue),
        mobility: run.finalMobility === null ? null : Math.round(run.finalMobility),
        endurance: run.finalEndurance === null ? null : Math.round(run.finalEndurance),
        performance: run.finalPerformance === null ? null : Math.round(run.finalPerformance),
      } : null;

  const activeScenarioName = activeScenario?.name ?? "No mission scenario";
  const activeScenarioId = activeScenario?.id ?? "";
  const factors = activeScenario ? normalizeFactors({ terrainType: activeScenario.terrainType, altitudeMeters: activeScenario.altitudeMeters, temperatureCelsius: activeScenario.temperatureCelsius, loadKg: activeScenario.loadKg, distanceKm: activeScenario.distanceKm, durationMinutes: activeScenario.durationMinutes, restMinutes: activeScenario.restMinutes, timeOfDay: activeScenario.timeOfDay }) : null;

  return (
    <AppShell
      title="Mission Readiness · Overview"
      meta={
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] text-[var(--gray-300)]">
            MISSION WORKSTATION
          </span>
            <StatusBadge tone={activeScenario ? "cyan" : "muted"}>{activeScenario ? "SAVED SCENARIOS" : "NO SCENARIOS"}</StatusBadge>
        </div>
      }
    >
      <PageHeader
        eyebrow="MISSION SIMULATION OVERVIEW"
        title="Mission Readiness"
        description="Defence mission readiness analysis focused on personnel, fatigue, recovery, group capability and historical operational learning. Current outputs are relative prototype estimates."
        actions={
          <>
            <Button href="/missions/new" variant="secondary" size="sm">
              Configure Mission
            </Button>
            {activeScenarioId ? (
              <Button href={`/simulator/${activeScenarioId}`} size="sm">
                Open Simulator
              </Button>
            ) : null}
          </>
        }
      />

      <section aria-label="Platform inventory" className="mb-6 grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--ink-panel)] sm:grid-cols-3 lg:grid-cols-6">
        <InventoryLink href="/soldiers" label="Personnel" value={soldierCount} note={unknownProfileCount + " with unknown profile source"} />
        <InventoryLink href="/organization" label="Units" value={unitCount} note="Top-level organizational units" />
        <InventoryLink href="/missions" label="Missions" value={scenarioCount} note="Saved scenarios" />
        <InventoryLink href="/missions" label="Group runs" value={groupRunCount} note="Persisted group simulations" />
        <InventoryLink href="/learning" label="Approved reports" value={approvedOperationCount} note={approvedLessonCount + " approved lessons"} />
        <InventoryLink href="/missions" label="Completed runs" value={completedRunCount} note="Persisted individual runs" />
      </section>

      <div className="space-y-6">
        {/* 1. TOP HERO SECTION */}
        {activeScenario ? <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          {/* LEFT: MISSION SCENARIO */}
          <Panel className="!p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="label-xs text-[var(--cyan)]">ACTIVE SCENARIO</div>
                <StatusBadge tone="cyan">{terrainLabel(activeScenario.terrainType)}</StatusBadge>
              </div>

              <h2 className="text-[22px] font-bold tracking-tight text-[var(--white)] uppercase">
                {activeScenarioName}
              </h2>
              <p className="text-[12px] text-[var(--gray-300)] mt-0.5">
                {activeScenario.description ?? "Saved mission configuration"}
              </p>

              {/* Environmental Indicators Grid */}
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-b border-[var(--border)] py-3">
                <EnvMeta icon={<Compass size={13} />} label="ALTITUDE" value={`${activeScenario.altitudeMeters} m`} />
                <EnvMeta icon={<Thermometer size={13} />} label="TEMPERATURE" value={`${activeScenario.temperatureCelsius}°C`} />
                <EnvMeta icon={<Layers size={13} />} label="LOAD" value={`${activeScenario.loadKg} kg`} />
                <EnvMeta icon={<Clock size={13} />} label="DURATION" value={`${(activeScenario.durationMinutes / 60).toFixed(1)} h`} />
                <EnvMeta icon={<Zap size={13} />} label="DISTANCE" value={`${activeScenario.distanceKm} km`} />
                <EnvMeta icon={<ShieldAlert size={13} />} label="TIME / LIGHT" value={activeScenario.timeOfDay} />
              </div>
            </div>

            {/* Terrain & Route SVG Preview */}
            <MissionRoutePreview
              scenarioName={activeScenarioName}
              altitudeMeters={activeScenario.altitudeMeters}
              distanceKm={activeScenario.distanceKm}
              terrainType={activeScenario.terrainType}
            />
          </Panel>

          {/* RIGHT: SIMULATED READINESS HERO GAUGE */}
          <Panel className="!p-5 flex flex-col justify-between items-center text-center">
            <div className="w-full flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="label-xs text-[var(--cyan)]">SIMULATED READINESS</div>
              <StatusBadge tone={run ? "cyan" : "muted"}>{run ? "SAVED RUN" : "NO SAVED RUN"}</StatusBadge>
            </div>

            {final?.performance != null ? <div className="py-4">
              <ReadinessGauge
                type="ring"
                value={final.performance}
                size={190}
                label="READINESS INDEX"
                sublabel="Relative simulated capacity"
              />
            </div> : <EmptyState title="No saved simulation" description="Run this scenario in the simulator to populate saved result metrics." action={activeScenarioId ? <Button href={`/simulator/${activeScenarioId}`} size="sm">Open simulator</Button> : undefined} />}

            <div className="w-full border-t border-[var(--border)] pt-3 text-left">
              <div className="flex items-center justify-between text-[11px] text-[var(--gray-500)] mono">
                <span>MODEL CONTEXT</span>
                <span className="text-[var(--cyan)]">RELATIVE MODEL INDEX</span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--gray-500)]">
                Not a clinical measurement. Indicates relative performance degradation under environmental stress.
              </p>
            </div>
          </Panel>
        </div> : <EmptyState title="No mission scenarios yet" description="Create a mission to see its saved configuration and simulation results here." action={<Button href="/missions/new" size="sm">Configure mission</Button>} />}

        {/* 2. FOUR HUMAN PERFORMANCE METRICS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            label="FATIGUE"
            value={final?.fatigue ?? "—"}
            trendText={run ? "Saved run" : "No result"}
            subtext="Higher number = greater fatigue"
          />
          <MetricTile
            label="MOBILITY"
            value={final?.mobility ?? "—"}
            trendText={run ? "Saved run" : "No result"}
            subtext="Higher number = better mobility"
          />
          <MetricTile
            label="ENDURANCE"
            value={final?.endurance ?? "—"}
            trendText={run ? "Saved run" : "No result"}
            subtext="Higher number = better endurance"
          />
          <MetricTile
            label="PERFORMANCE"
            value={final?.performance ?? "—"}
            trendText={run ? "Saved run" : "No result"}
            subtext="Higher number = better overall output"
            highlight
          />
        </div>

        {/* 3. PERFORMANCE THROUGH MISSION TIMELINE & GRAPH */}
        <Panel className="!p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <div className="label-xs text-[var(--cyan)]">THE HUMAN CHANGES WITH THE MISSION</div>
              <h3 className="text-[16px] font-semibold text-[var(--white)]">
                PERFORMANCE THROUGH MISSION
              </h3>
              <p className="text-[12px] text-[var(--gray-300)]">Saved simulation snapshots · {activeScenario ? `${activeScenario.durationMinutes} mission minutes` : "mission duration unavailable"}</p>
            </div>

            {run ? <StatusBadge tone="cyan">{run.modelVersion ?? "MODEL VERSION UNKNOWN"}</StatusBadge> : <StatusBadge tone="muted">NO SAVED SNAPSHOTS</StatusBadge>}
          </div>

          {snaps.length > 0 ? <SimulationChart
            data={snaps.map((s: { timeMinutes: number; fatigue: number; mobility: number; endurance: number; performance: number }) => ({
                    timeMinutes: s.timeMinutes,
                    fatigue: s.fatigue,
                    mobility: s.mobility,
                    endurance: s.endurance,
                    performance: s.performance,
                  }))}
            height={320}
          /> : <EmptyState title="No saved timeline" description="Run a mission simulation to populate this chart from persisted snapshots." />}
        </Panel>

        {/* 4. WHY DID THE STATE CHANGE? & OPERATIONAL MEMORY */}
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          {/* LEFT: WHY DID THE STATE CHANGE? */}
          <Panel className="!p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                <div>
                  <div className="label-xs text-[var(--cyan)]">SIMULATION EXPLANATION</div>
                  <h3 className="text-[15px] font-semibold text-[var(--white)]">
                    WHY DID THE STATE CHANGE?
                  </h3>
                </div>
                <StatusBadge tone="muted">NORMALIZED INPUTS</StatusBadge>
              </div>

              {factors ? <div className="grid grid-cols-2 gap-2">{Object.entries({ load: factors.loadFactor, altitude: factors.altitudeFactor, temperature: factors.temperatureFactor, terrain: factors.terrainFactor, duration: factors.durationFactor, distance: factors.distanceFactor, recovery: factors.recoveryFactor, night: factors.nightFactor, combinedStress: factors.environmentStress }).map(([label, value]) => <div key={label} className="rounded border border-[var(--border)] bg-[#090f1b] p-2"><div className="flex justify-between text-[10px] text-[var(--gray-400)]"><span>{label}</span><span className="mono">{value.toFixed(2)}</span></div><div className="mt-1 h-1 overflow-hidden rounded bg-[var(--gray-800)]"><div className="h-full bg-[var(--cyan)]" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} /></div></div>)}</div> : <p className="text-[12px] text-[var(--gray-500)]">No saved mission inputs available.</p>}
            </div>

            <div className="mt-4 rounded bg-[#090f1b] p-3 border border-[var(--border)] text-[12px] text-[var(--gray-300)] flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--cyan)] shrink-0" />
              <span>
                Higher load, prolonged duration and limited recovery increase simulated fatigue.
              </span>
            </div>
          </Panel>

          {/* RIGHT: OPERATIONAL MEMORY & WHAT-IF */}
          <div className="space-y-5 flex flex-col justify-between">
            {/* OPERATIONAL MEMORY PRODUCT STORY */}
            <Panel className="!p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <div className="label-xs text-[var(--cyan)]">LEARNING FEEDBACK</div>
                  <h3 className="text-[15px] font-semibold text-[var(--white)]">
                    OPERATIONAL MEMORY
                  </h3>
                </div>
                <StatusBadge tone="cyan">PAST → FUTURE</StatusBadge>
              </div>

              <p className="text-[12px] text-[var(--gray-300)]">
                Previous operations provide reusable scenario context for future simulations.
              </p>

              {/* Visual Flow Mini Map */}
              <div className="flex items-center justify-between text-[10px] mono text-[var(--gray-300)] bg-[#090f1b] p-2.5 rounded border border-[var(--border)]">
                <span>PAST OP</span>
                <ArrowRight className="h-3 w-3 text-[var(--cyan)]" />
                <span>LESSONS</span>
                <ArrowRight className="h-3 w-3 text-[var(--cyan)]" />
                <span>SIMILAR SCENARIO</span>
                <ArrowRight className="h-3 w-3 text-[var(--cyan)]" />
                <span className="text-[var(--cyan)] font-semibold">SIMULATION</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded bg-[var(--ink)]/80 p-3 border border-[var(--border)]">
                    <div className="text-[10px] uppercase text-[var(--gray-500)]">APPROVED HISTORICAL OPS</div>
                  <div className="mono tabular text-xl font-bold text-[var(--white)] mt-0.5">
                    {approvedOperationCount}
                  </div>
                </div>
                <div className="rounded bg-[var(--ink)]/80 p-3 border border-[var(--border)]">
                  <div className="text-[10px] uppercase text-[var(--gray-500)]">RECENT SIMS</div>
                  <div className="mono tabular text-xl font-bold text-[var(--cyan)] mt-0.5">
                    {recentRuns.length}
                  </div>
                </div>
              </div>

              <Button href="/learning" variant="secondary" className="w-full justify-between" size="sm">
                <span>OPEN LEARNING MODULE</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Panel>

            {/* WHAT-IF COMPACT ENTRY CARD */}
            <Panel className="!p-4 bg-gradient-to-r from-[var(--ink-panel)] to-[#0c1626]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="mono text-[11px] font-semibold text-[var(--cyan)]">WHAT-IF COMPARISON</div>
                  <div className="text-[12px] text-[var(--gray-300)] mt-0.5">
                    Change mission factors & compare simulated outcomes.
                  </div>
                </div>
                <Button href="/what-if" size="sm" className="shrink-0">
                  COMPARE
                </Button>
              </div>
            </Panel>
          </div>
        </div>

        {/* 5. RECENT SCENARIOS LIST */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="label-xs text-[var(--cyan)]">SCENARIO HISTORY</div>
              <h3 className="text-[15px] font-semibold text-[var(--white)]">
                RECENT MISSION SIMULATIONS
              </h3>
            </div>
            <Link href="/missions" className="text-[12px] text-[var(--cyan)] hover:underline mono">
              VIEW ALL MISSIONS →
            </Link>
          </div>

          {recentScenarios.length === 0 ? <EmptyState title="No saved missions" description="Create a scenario to start the product workflow." action={<Button href="/missions/new" size="sm">Configure mission</Button>} /> : <div className="grid gap-3 md:grid-cols-3">
            {recentScenarios.map((s) => (
              <Link
                key={s.id}
                href={`/simulator/${s.id}`}
                className="panel p-4 transition-all duration-200 hover:border-[var(--cyan)]/40 hover:bg-[#0f192b]"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="mono text-[10px] text-[var(--cyan)] font-semibold">SCENARIO</span>
                  <span className="mono text-[10px] text-[var(--gray-500)]">RECENT</span>
                </div>
                <div className="text-[14px] font-semibold text-[var(--white)]">
                  {s.name}
                </div>
                <div className="mt-2 text-[11px] text-[var(--gray-300)] mono flex items-center gap-2">
                  <span>{s.altitudeMeters}m</span>
                  <span>·</span>
                  <span>{s.loadKg}kg</span>
                  <span>·</span>
                  <span>{s.durationMinutes / 60}h</span>
                </div>
                <div className="mt-3 border-t border-[var(--border)] pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-[var(--gray-500)]">Simulated Index</span>
                  <span className="mono tabular text-sm font-semibold text-[var(--cyan)]">
                    {s.runs?.[0]?.finalPerformance == null ? "—" : Math.round(s.runs[0].finalPerformance)}
                  </span>
                </div>
              </Link>
            ))}
          </div>}
        </div>
      </div>
    </AppShell>
  );
}

function InventoryLink({ href, label, value, note }: { href: string; label: string; value: number; note: string }) {
  return <Link href={href} className="border-b border-r border-[var(--border)] px-4 py-3.5 transition-colors hover:bg-white/[0.035] sm:px-3 lg:border-b-0"><div className="label-xs">{label}</div><div className="mt-1 font-mono text-[23px] font-medium tabular text-[var(--white)]">{value}</div><div className="mt-0.5 truncate text-[10px] text-[var(--gray-500)]">{note}</div></Link>;
}

function EnvMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 text-[10px] uppercase text-[var(--gray-500)] font-medium">
        <span className="text-[var(--cyan)]">{icon}</span>
        {label}
      </div>
      <div className="mono tabular text-[13px] font-semibold text-[var(--off-white)] mt-0.5">
        {value}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  trendText,
  subtext,
  highlight = false,
}: {
  label: string;
  value: number | string;
  trendText: string;
  subtext: string;
  highlight?: boolean;
}) {
  return (
    <Panel
      className={`!p-4 space-y-2 relative ${
        highlight ? "border-[var(--cyan)]/40 bg-[rgba(85,216,245,0.04)]" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium tracking-wider text-[var(--gray-500)] uppercase">
          {label}
        </span>
        <span className="mono text-[10px] text-[var(--gray-300)]">{trendText}</span>
      </div>
      <div
        className={`mono tabular text-3xl font-bold tracking-tight ${
          highlight ? "text-[var(--cyan)]" : "text-[var(--white)]"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-[var(--gray-500)]">{subtext}</div>
    </Panel>
  );
}

