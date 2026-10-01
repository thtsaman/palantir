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
  const [scenario, recentScenarios, recentRuns, opCount] = await Promise.all([
    prisma.missionScenario.findFirst({
      where: { name: "High Altitude Patrol" },
      include: {
        soldier: true,
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { snapshots: { orderBy: { timeMinutes: "asc" } } },
        },
      },
    }),
    prisma.missionScenario.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { snapshots: { orderBy: { timeMinutes: "asc" } } },
        },
      },
    }),
    prisma.missionRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { scenario: true, soldier: true },
    }),
    prisma.historicalOperation.count(),
  ]);

  const activeScenario = scenario ?? recentScenarios[0];
  const run = activeScenario?.runs?.[0];
  const snaps = run?.snapshots ?? [];

  const final = run
    ? {
        fatigue: Math.round(run.finalFatigue ?? 58),
        mobility: Math.round(run.finalMobility ?? 72),
        endurance: Math.round(run.finalEndurance ?? 64),
        performance: Math.round(run.finalPerformance ?? 69),
      }
    : {
        fatigue: 58,
        mobility: 72,
        endurance: 64,
        performance: 69,
      };

  const activeScenarioName = activeScenario?.name ?? "High Altitude Patrol";
  const activeScenarioId = activeScenario?.id ?? "";

  return (
    <AppShell
      title="Mission Readiness · Overview"
      meta={
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] text-[var(--gray-300)]">
            MISSION WORKSTATION
          </span>
          <StatusBadge tone="cyan">SIMULATION READY</StatusBadge>
        </div>
      }
    >
      <PageHeader
        eyebrow="MISSION SIMULATION OVERVIEW"
        title="Mission Readiness"
        description="See how mission conditions change the simulated human state over time."
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

      <div className="space-y-6">
        {/* 1. TOP HERO SECTION */}
        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          {/* LEFT: MISSION SCENARIO */}
          <Panel className="!p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="label-xs text-[var(--cyan)]">ACTIVE SCENARIO</div>
                <StatusBadge tone="cyan">MOUNTAIN PATROL</StatusBadge>
              </div>

              <h2 className="text-[22px] font-bold tracking-tight text-[var(--white)] uppercase">
                {activeScenarioName}
              </h2>
              <p className="text-[12px] text-[var(--gray-300)] mt-0.5">
                Mountain Environment · High-altitude endurance patrol scenario
              </p>

              {/* Environmental Indicators Grid */}
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-b border-[var(--border)] py-3">
                <EnvMeta icon={<Compass size={13} />} label="ALTITUDE" value={`${activeScenario?.altitudeMeters ?? 3500} m`} />
                <EnvMeta icon={<Thermometer size={13} />} label="TEMPERATURE" value={`${activeScenario?.temperatureCelsius ?? -5}°C`} />
                <EnvMeta icon={<Layers size={13} />} label="LOAD" value={`${activeScenario?.loadKg ?? 18} kg`} />
                <EnvMeta icon={<Clock size={13} />} label="DURATION" value={`${(activeScenario?.durationMinutes ?? 480) / 60} h`} />
                <EnvMeta icon={<Zap size={13} />} label="DISTANCE" value="12 km" />
                <EnvMeta icon={<ShieldAlert size={13} />} label="TIME / LIGHT" value={activeScenario?.timeOfDay ?? "NIGHT"} />
              </div>
            </div>

            {/* Terrain & Route SVG Preview */}
            <MissionRoutePreview
              scenarioName={activeScenarioName}
              altitudeMeters={activeScenario?.altitudeMeters ?? 3500}
              distanceKm={12}
            />
          </Panel>

          {/* RIGHT: SIMULATED READINESS HERO GAUGE */}
          <Panel className="!p-5 flex flex-col justify-between items-center text-center">
            <div className="w-full flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="label-xs text-[var(--cyan)]">SIMULATED READINESS</div>
              <StatusBadge tone="muted">MID-MISSION</StatusBadge>
            </div>

            <div className="py-4">
              <ReadinessGauge
                type="ring"
                value={final.performance}
                size={190}
                label="READINESS INDEX"
                sublabel="Relative simulated capacity"
              />
            </div>

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
        </div>

        {/* 2. FOUR HUMAN PERFORMANCE METRICS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            label="FATIGUE"
            value={final.fatigue}
            trendText="↗ Accumulated"
            subtext="Higher number = greater fatigue"
          />
          <MetricTile
            label="MOBILITY"
            value={final.mobility}
            trendText="↘ Mobility index"
            subtext="Higher number = better mobility"
          />
          <MetricTile
            label="ENDURANCE"
            value={final.endurance}
            trendText="↘ Stamina reserve"
            subtext="Higher number = better endurance"
          />
          <MetricTile
            label="PERFORMANCE"
            value={final.performance}
            trendText="↘ Overall output"
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
              <p className="text-[12px] text-[var(--gray-300)]">
                Relative simulated indices across mission time (00:00 → 08:00)
              </p>
            </div>

            {/* Stage Timeline Navigation */}
            <div className="flex items-center gap-1.5 text-[10px] mono text-[var(--gray-300)] bg-[#090f1b] px-3 py-1.5 rounded border border-[var(--border)]">
              <span className="text-[var(--cyan)] font-semibold">START (0h)</span>
              <span>→</span>
              <span>2 H</span>
              <span>→</span>
              <span>4 H (REST)</span>
              <span>→</span>
              <span>6 H</span>
              <span>→</span>
              <span className="text-[var(--white)]">8 H (END)</span>
            </div>
          </div>

          <SimulationChart
            data={
              snaps.length > 0
                ? snaps.map((s: { timeMinutes: number; fatigue: number; mobility: number; endurance: number; performance: number }) => ({
                    timeMinutes: s.timeMinutes,
                    fatigue: s.fatigue,
                    mobility: s.mobility,
                    endurance: s.endurance,
                    performance: s.performance,
                  }))
                : mockSnapshots()
            }
            height={320}
          />
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
                <StatusBadge tone="muted">INFLUENCE MODEL</StatusBadge>
              </div>

              <div className="space-y-3">
                <InfluenceBar label="LOAD (18 kg)" percentage={42} desc="Carried equipment weight" />
                <InfluenceBar label="ALTITUDE (3500 m)" percentage={35} desc="Reduced oxygen saturation" />
                <InfluenceBar label="TEMPERATURE (-5°C)" percentage={28} desc="Cold exposure metabolic cost" />
                <InfluenceBar label="TERRAIN (Mountain)" percentage={24} desc="Difficult incline navigation" />
                <InfluenceBar label="REST (15 min)" percentage={-15} desc="Brief recovery period" />
              </div>
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
                  <div className="text-[10px] uppercase text-[var(--gray-500)]">HISTORICAL OPS</div>
                  <div className="mono tabular text-xl font-bold text-[var(--white)] mt-0.5">
                    {opCount || 5}
                  </div>
                </div>
                <div className="rounded bg-[var(--ink)]/80 p-3 border border-[var(--border)]">
                  <div className="text-[10px] uppercase text-[var(--gray-500)]">RECENT SIMS</div>
                  <div className="mono tabular text-xl font-bold text-[var(--cyan)] mt-0.5">
                    {recentRuns.length || 5}
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

          <div className="grid gap-3 md:grid-cols-3">
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
                    {Math.round(s.runs?.[0]?.finalPerformance ?? 69)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
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
  value: number;
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

function InfluenceBar({
  label,
  percentage,
  desc,
}: {
  label: string;
  percentage: number;
  desc: string;
}) {
  const isNegative = percentage < 0;
  const absVal = Math.abs(percentage);

  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="font-mono text-[var(--white)] font-medium">{label}</span>
        <span className="mono text-[var(--gray-300)]">
          {isNegative ? `${percentage}% (recovery)` : `+${percentage}% fatigue`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--gray-800)] overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isNegative ? "bg-[var(--gray-500)]" : "bg-[var(--cyan)]"
          }`}
          style={{ width: `${Math.min(100, absVal * 2)}%` }}
        />
      </div>
      <div className="text-[9px] text-[var(--gray-500)] mt-0.5">{desc}</div>
    </div>
  );
}

function mockSnapshots() {
  return [
    { timeMinutes: 0, fatigue: 12, mobility: 94, endurance: 91, performance: 93 },
    { timeMinutes: 120, fatigue: 32, mobility: 84, endurance: 82, performance: 84 },
    { timeMinutes: 240, fatigue: 48, mobility: 75, endurance: 71, performance: 74 },
    { timeMinutes: 360, fatigue: 54, mobility: 73, endurance: 66, performance: 70 },
    { timeMinutes: 480, fatigue: 58, mobility: 72, endurance: 64, performance: 69 },
  ];
}
