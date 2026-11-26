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
import { SimulationDeltaModule } from "@/components/soldier/SimulationDeltaModule";
import { SimulationHistoryList } from "@/components/soldier/SimulationHistoryList";
import { SimulationChart } from "@/components/charts/SimulationChart";
import { assessEnvironment } from "@/lib/soldier-intelligence";
import { WorkloadAssessment } from "@/components/soldier/WorkloadAssessment";
import { EditSoldierForm } from "@/components/soldier/EditSoldierForm";
import { IndividualReadinessPanel } from "@/components/readiness/IndividualReadinessPanel";
import { prisma } from "@/lib/prisma";
import type { MissionInputs, PerformancePoint, SoldierBaseline } from "@/lib/simulation";

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
  const environments = assessEnvironment(soldier);
  const savedInputs = latestRun?.inputsSnapshot as MissionInputs | null | undefined;
  const savedBaseline = latestRun?.baselineSnapshot as SoldierBaseline | null | undefined;
  const savedProvenance = latestRun?.baselineProvenanceSnapshot as Record<string, string> | null | undefined;
  const readinessData = latestRun && savedInputs && savedBaseline ? {
    inputs: savedInputs,
    baseline: savedBaseline,
    snapshots: latestSnapshots.map((point): PerformancePoint => ({ timeMinutes: point.timeMinutes, fatigue: point.fatigue, mobility: point.mobility, endurance: point.endurance, performance: point.performance })),
    modelVersion: latestRun.modelVersion ?? "legacy model version unknown",
    provenance: {
      baselineMobility: provenanceState(savedProvenance?.baselineMobility ?? null),
      baselineEndurance: provenanceState(savedProvenance?.baselineEndurance ?? null),
      baselineStrength: provenanceState(savedProvenance?.baselineStrength ?? null),
      baselineRecovery: provenanceState(savedProvenance?.baselineRecovery ?? null),
      typicalLoadKg: provenanceState(savedProvenance?.typicalLoadKg ?? null),
    },
  } : null;

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
        title={soldier.displayName || soldier.soldierCode}
        description={`${soldier.role.name} · ${soldier.role.squad.name} · ${soldier.role.squad.unit.name}`}
        actions={
          <>
            <Button href="/soldiers" variant="secondary" size="sm">
              Back to Library
            </Button>
            <Button href={`/missions/new?soldierId=${soldier.id}`} size="sm">
              Simulate This Soldier
            </Button>
            <EditSoldierForm soldier={{ ...soldier, assessmentDate: soldier.assessmentDate?.toISOString() ?? null, profileAssessedAt: soldier.profileAssessedAt?.toISOString() ?? null }} />
          </>
        }
      />

      <div className="space-y-6">
        <Panel className="!p-5">
          <SectionHeader title="Profile information" subtitle="Recorded identity and organizational assignment" action={<StatusBadge tone="muted">{soldier.profileProvenance?.replaceAll("_", " ") ?? "SOURCE UNKNOWN"}</StatusBadge>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileField label="Soldier ID" value={soldier.soldierCode} />
            <ProfileField label="Name / display" value={soldier.displayName ?? "Not recorded"} />
            <ProfileField label="Age" value={soldier.ageYears == null ? "Not recorded" : `${soldier.ageYears} years`} />
            <ProfileField label="Height" value={soldier.heightCm == null ? "Not recorded" : `${soldier.heightCm} cm`} />
            <ProfileField label="Weight" value={soldier.weightKg == null ? "Not recorded" : `${soldier.weightKg} kg`} />
            <ProfileField label="Role" value={soldier.role.name} />
            <ProfileField label="Experience" value={`${soldier.experienceYears} years`} />
            <ProfileField label="Squad" value={soldier.role.squad.name} />
            <ProfileField label="Unit" value={soldier.role.squad.unit.name} />
            <ProfileField label="Profile date" value={soldier.profileAssessedAt?.toISOString().slice(0, 10) ?? "Not recorded"} />
            <ProfileField label="Profile source" value={soldier.profileSource ?? "Not recorded"} />
          </div>
          {soldier.fitnessAssessment ? <p className="mt-4 border-t border-[var(--border)] pt-3 text-[13px] text-[var(--gray-300)]"><span className="label-xs mr-2">Fitness assessment</span>{soldier.fitnessAssessment}</p> : <p className="mt-4 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--gray-500)]">No fitness assessment information recorded.</p>}
          {soldier.assessmentDate || soldier.assessmentSource ? <p className="mt-2 text-[11px] text-[var(--gray-500)]">Assessment {soldier.assessmentDate?.toISOString().slice(0, 10) ?? "date not recorded"} · Source: {soldier.assessmentSource ?? "not recorded"}</p> : null}
        </Panel>
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
                  sub="Stored mobility baseline index"
                  provenance={soldier.mobilityProvenance}
                />
                <MetricBarRow
                  label="ENDURANCE BASELINE"
                  value={soldier.baselineEndurance}
                  sub="Stored endurance baseline index"
                  provenance={soldier.enduranceProvenance}
                />
                <MetricBarRow
                  label="STRENGTH BASELINE"
                  value={soldier.baselineStrength}
                  sub="Stored strength baseline index"
                  provenance={soldier.strengthProvenance}
                />
                <MetricBarRow
                  label="RECOVERY BASELINE"
                  value={soldier.baselineRecovery}
                  sub="Stored recovery baseline index"
                  provenance={soldier.recoveryProvenance}
                />
              </div>
            </div>

            <p className="border-t border-[var(--border)] px-5 py-3 text-[11px] leading-relaxed text-[var(--gray-500)]">Values are stored relative baseline indices. They are shown separately because no validated composite score or medical interpretation is defined.</p>
          </Panel>
        </div>

        {/* 3. BASELINE vs LATEST SIMULATED STATE DELTA */}
        <SimulationDeltaModule
          baselineIndex={baselineIndex}
          latestPerformance={latestRun?.finalPerformance ?? undefined}
          latestFatigue={latestRun?.finalFatigue ?? undefined}
          scenarioName={latestRun?.scenario.name ?? undefined}
          terrainType={latestRun?.scenario.terrainType ?? undefined}
          altitudeMeters={latestRun?.scenario.altitudeMeters ?? undefined}
          loadKg={latestRun?.scenario.loadKg ?? undefined}
          durationMinutes={latestRun?.scenario.durationMinutes ?? undefined}
        />
        <IndividualReadinessPanel data={readinessData} scope="Latest persisted mission run" />

        <Panel className="!p-5 space-y-4">
          <SectionHeader title="Environmental evidence" subtitle="Profile indicators only; no suitability score or deployment recommendation" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {environments.map((assessment) => <article key={assessment.category} className="border-l-2 border-[var(--border-strong)] pl-4 py-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-[14px] font-semibold text-[var(--white)]">{assessment.label}</h3><StatusBadge tone={assessment.status === "INSUFFICIENT_DATA" ? "muted" : "cyan"}>{assessment.status.replaceAll("_", " ")}</StatusBadge></div>
              <p className="mt-2 text-[11px] text-[var(--gray-500)]">Confidence: {assessment.confidence.replaceAll("_", " ")}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--gray-300)]">{assessment.explanation}</p>
              {assessment.supporting.length ? <div className="mt-3"><div className="label-xs">Available information</div><ul className="mt-1 list-disc pl-4 text-[11px] text-[var(--gray-300)]">{assessment.supporting.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
              {assessment.strengths.length ? <ProfileList label="Potential strengths" items={assessment.strengths} /> : null}
              {assessment.limitations.length ? <ProfileList label="Limitations" items={assessment.limitations} /> : null}
              <ProfileList label="Missing information" items={assessment.missing} />
            </article>)}
          </div>
          <p className="border-t border-[var(--border)] pt-3 text-[11px] text-[var(--gray-500)]">Baseline values are not environmental qualifications. Height and weight alone do not establish suitability. This is a non-medical, non-validated evidence summary for human review.</p>
        </Panel>

        <WorkloadAssessment baseline={{ baselineMobility: soldier.baselineMobility, baselineEndurance: soldier.baselineEndurance, baselineStrength: soldier.baselineStrength, baselineRecovery: soldier.baselineRecovery, experienceYears: soldier.experienceYears, typicalLoadKg: soldier.typicalLoadKg }} />

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

function provenanceState(value: string | null): "KNOWN" | "UNKNOWN" | "SYNTHETIC" {
  if (value === "SYNTHETIC_DEMO") return "SYNTHETIC";
  if (value === "USER_ENTERED" || value === "IMPORTED") return "KNOWN";
  return "UNKNOWN";
}

function MetricBarRow({
  label,
  value,
  sub,
  provenance,
}: {
  label: string;
  value: number;
  sub: string;
  provenance: string | null;
}) {
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-1.5">
        <div>
          <div className="font-mono text-[10px] text-[var(--gray-300)] uppercase tracking-wider group-hover:text-[var(--white)] transition-colors">{label}</div>
          <div className="text-[9px] text-[var(--gray-500)] mt-0.5">{sub}</div>
          <div className="text-[9px] text-[var(--gray-500)] mt-0.5">Source: {provenance?.replaceAll("_", " ") ?? "Not recorded"}</div>
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

function ProfileField({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-[var(--border)] pb-2"><div className="label-xs">{label}</div><div className="mt-1 text-[13px] text-[var(--off-white)]">{value}</div></div>;
}

function ProfileList({ label, items }: { label: string; items: string[] }) {
  return <div className="mt-3"><div className="label-xs">{label}</div><ul className="mt-1 list-disc pl-4 text-[11px] leading-relaxed text-[var(--gray-500)]">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
