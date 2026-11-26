import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { runSimulation } from "@/lib/simulation";
import type { MissionInputs, PerformancePoint, SoldierBaseline } from "@/lib/simulation";
import { HistoricalContextPanel } from "@/components/historical/HistoricalContextPanel";
import { IndividualReadinessPanel } from "@/components/readiness/IndividualReadinessPanel";
import {
  SimulatorClient,
  type SimulatorScenario,
  type SimulatorSoldier,
} from "./SimulatorClient";

export const dynamic = "force-dynamic";

export default async function SimulatorScenarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const scenario = await prisma.missionScenario.findUnique({
    where: { id },
    include: {
      soldier: {
        include: {
          role: {
            include: {
              squad: {
                include: {
                  roles: {
                    include: { soldiers: { orderBy: { soldierCode: "asc" } } },
                  },
                },
              },
            },
          },
        },
      },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          snapshots: { orderBy: { timeMinutes: "asc" } },
        },
      },
    },
  });

  if (!scenario) notFound();

  const inputs: MissionInputs = {
    terrainType: scenario.terrainType,
    altitudeMeters: scenario.altitudeMeters,
    temperatureCelsius: scenario.temperatureCelsius,
    loadKg: scenario.loadKg,
    distanceKm: scenario.distanceKm,
    durationMinutes: scenario.durationMinutes,
    restMinutes: scenario.restMinutes,
    timeOfDay: scenario.timeOfDay,
  };

  const currentBaseline: Partial<SoldierBaseline> = scenario.soldier
    ? {
        baselineMobility: scenario.soldier.baselineMobility,
        baselineEndurance: scenario.soldier.baselineEndurance,
        baselineStrength: scenario.soldier.baselineStrength,
        baselineRecovery: scenario.soldier.baselineRecovery,
        experienceYears: scenario.soldier.experienceYears,
        typicalLoadKg: scenario.soldier.typicalLoadKg,
      }
    : {};

  const latestRun = scenario.runs[0];
  const savedProvenance = latestRun?.baselineProvenanceSnapshot as Record<string, string> | null | undefined;
  const provenanceState = (saved: string | null | undefined, current: string | null | undefined) => {
    const value = latestRun ? saved : current;
    return value === "SYNTHETIC_DEMO" ? "SYNTHETIC" as const : value === "USER_ENTERED" || value === "IMPORTED" ? "KNOWN" as const : "UNKNOWN" as const;
  };
  const hasStoredSnapshots = Boolean(latestRun?.snapshots.length);
  const savedInputs = latestRun?.inputsSnapshot as MissionInputs | null;
  const savedBaseline = latestRun?.baselineSnapshot as SoldierBaseline | null;
  const resultInputs = savedInputs ?? inputs;
  const resultBaseline = savedBaseline ?? currentBaseline;
  const computed = runSimulation(resultInputs, resultBaseline);
  const source: "stored" | "computed" = hasStoredSnapshots ? "stored" : "computed";

  const snapshots: PerformancePoint[] =
    source === "stored"
      ? latestRun!.snapshots.map((s) => ({
          timeMinutes: s.timeMinutes,
          fatigue: s.fatigue,
          mobility: s.mobility,
          endurance: s.endurance,
          performance: s.performance,
        }))
      : computed.snapshots;

  const shownScenario = savedInputs ?? inputs;
  const scenarioPayload: SimulatorScenario = {
    id: scenario.id,
    name: scenario.name,
    terrainType: shownScenario.terrainType,
    altitudeMeters: shownScenario.altitudeMeters,
    temperatureCelsius: shownScenario.temperatureCelsius,
    loadKg: shownScenario.loadKg,
    distanceKm: shownScenario.distanceKm,
    durationMinutes: shownScenario.durationMinutes,
    restMinutes: shownScenario.restMinutes,
    timeOfDay: shownScenario.timeOfDay,
    description: scenario.description,
    soldierId: scenario.soldierId,
  };

  const savedSoldierId = latestRun?.soldierId ?? scenario.soldierId;
  const resultSoldierRow = savedSoldierId ? await prisma.soldier.findUnique({ where: { id: savedSoldierId }, include: { role: { include: { squad: { include: { unit: true, platoon: { include: { company: true } } } } } } } }) : null;
  const soldierPayload: SimulatorSoldier | null = savedSoldierId
    ? {
        id: savedSoldierId,
        soldierCode: resultSoldierRow?.soldierCode ?? "Historical soldier",
        ...(savedBaseline ?? currentBaseline as SoldierBaseline),
        provenance: {
          mobility: provenanceState(savedProvenance?.baselineMobility, resultSoldierRow?.mobilityProvenance),
          endurance: provenanceState(savedProvenance?.baselineEndurance, resultSoldierRow?.enduranceProvenance),
          strength: provenanceState(savedProvenance?.baselineStrength, resultSoldierRow?.strengthProvenance),
          recovery: provenanceState(savedProvenance?.baselineRecovery, resultSoldierRow?.recoveryProvenance),
          typicalLoad: provenanceState(savedProvenance?.typicalLoadKg, resultSoldierRow?.typicalLoadProvenance),
        },
        fitnessAssessment: resultSoldierRow?.fitnessAssessment ?? null,
        assessmentSource: resultSoldierRow?.assessmentSource ?? null,
      }
    : null;

  const historicalBaseline: SimulatorSoldier | null = savedBaseline && !savedSoldierId
    ? { id: "generic", soldierCode: "Generic prototype", ...savedBaseline }
    : soldierPayload;
  const rosterPayload = resultSoldierRow ? [{ id: resultSoldierRow.id, soldierCode: resultSoldierRow.soldierCode }] : [];
  const unitStructure = resultSoldierRow ? await prisma.unit.findUnique({
    where: { id: resultSoldierRow.role.squad.unitId },
    include: {
      squads: { include: { roles: { include: { soldiers: { select: { id: true, soldierCode: true } } } } } },
      companies: {
        include: {
          platoons: {
            include: {
              squads: {
                include: {
                  roles: { include: { soldiers: { select: { id: true, soldierCode: true } } } },
                },
              },
            },
          },
        },
      },
    },
  }) : null;
  const rosterForSquads = (squads: NonNullable<typeof unitStructure>["squads"]) => squads.flatMap((squad) => squad.roles.flatMap((role) => role.soldiers.map((member) => ({ id: member.id, soldierCode: member.soldierCode }))));
  const allUnitSquads = unitStructure ? [...unitStructure.squads, ...unitStructure.companies.flatMap((company) => company.platoons.flatMap((platoon) => platoon.squads))] : [];
  const selectedPlatoon = unitStructure?.companies.flatMap((company) => company.platoons).find((platoon) => platoon.id === resultSoldierRow?.role.squad.platoonId) ?? null;
  const selectedCompany = selectedPlatoon ? unitStructure?.companies.find((company) => company.id === selectedPlatoon.companyId) ?? null : null;
  const squadRoster = rosterForSquads(unitStructure?.squads.filter((squad) => squad.id === resultSoldierRow?.role.squadId) ?? []);
  const formationRosters = {
    ...(resultSoldierRow ? { SOLDIER: [{ id: resultSoldierRow.id, soldierCode: resultSoldierRow.soldierCode }] } : {}),
    ...(squadRoster.length ? { SQUAD: squadRoster } : {}),
    ...(selectedPlatoon?.squads.length ? { PLATOON: rosterForSquads(selectedPlatoon.squads) } : {}),
    ...(selectedCompany?.platoons.length ? { COMPANY: rosterForSquads(selectedCompany.platoons.flatMap((platoon) => platoon.squads)) } : {}),
    ...(allUnitSquads.length ? { UNIT: rosterForSquads(allUnitSquads) } : {}),
  };
  const unitRosterPayload = rosterForSquads(allUnitSquads);
  const libraryRows = await prisma.soldier.findMany({ include: { role: { include: { squad: { include: { unit: true, platoon: { include: { company: true } } } } } } }, orderBy: { soldierCode: "asc" } });
  const availableSoldiers = libraryRows.map((member) => ({
    id: member.id, soldierCode: member.soldierCode, name: member.displayName ?? member.soldierCode, status: member.status,
    baselineMobility: member.baselineMobility, baselineEndurance: member.baselineEndurance, baselineStrength: member.baselineStrength, baselineRecovery: member.baselineRecovery,
    experienceYears: member.experienceYears, typicalLoadKg: member.typicalLoadKg,
    provenance: { mobility: member.mobilityProvenance ?? "UNKNOWN", endurance: member.enduranceProvenance ?? "UNKNOWN", strength: member.strengthProvenance ?? "UNKNOWN", recovery: member.recoveryProvenance ?? "UNKNOWN", typicalLoad: member.typicalLoadProvenance ?? "UNKNOWN" },
    fitnessAssessment: member.fitnessAssessment, assessmentSource: member.assessmentSource,
    squadId: member.role.squadId, squadName: member.role.squad.name, platoonId: member.role.squad.platoonId, platoonName: member.role.squad.platoon?.name ?? null,
    companyId: member.role.squad.platoon?.companyId ?? null, companyName: member.role.squad.platoon?.company.name ?? null, unitId: member.role.squad.unitId, unitName: member.role.squad.unit.name,
  }));
  const readinessData = latestRun && (!savedInputs || !savedBaseline) ? null : {
    inputs: resultInputs,
    baseline: computed.baselineUsed,
    snapshots,
    modelVersion: latestRun?.modelVersion ?? computed.modelVersion,
    provenance: {
      baselineMobility: provenanceState(savedProvenance?.baselineMobility, scenario.soldier?.mobilityProvenance),
      baselineEndurance: provenanceState(savedProvenance?.baselineEndurance, scenario.soldier?.enduranceProvenance),
      baselineStrength: provenanceState(savedProvenance?.baselineStrength, scenario.soldier?.strengthProvenance),
      baselineRecovery: provenanceState(savedProvenance?.baselineRecovery, scenario.soldier?.recoveryProvenance),
      typicalLoadKg: provenanceState(savedProvenance?.typicalLoadKg, scenario.soldier?.typicalLoadProvenance),
    },
  };

  return (
    <AppShell
      title={`Simulator · ${scenario.name}`}
      meta={<StatusBadge tone="muted">PROTOTYPE SIMULATION</StatusBadge>}
    >
      <SimulatorClient
        scenario={scenarioPayload}
        snapshots={snapshots}
        explanations={computed.explanations}
        modelVersion={latestRun?.modelVersion ?? null}
        snapshotStatus={latestRun && savedInputs && savedBaseline ? "complete" : latestRun ? "legacy" : "preview"}
        source={source}
        resultSoldier={historicalBaseline}
        factors={computed.factors}
        inputs={resultInputs}
        roster={unitRosterPayload.length ? unitRosterPayload : rosterPayload}
        formationRosters={formationRosters}
        availableSoldiers={availableSoldiers}
        sourceRunId={latestRun?.id ?? null}
        organization={{ squadId: resultSoldierRow?.role.squadId ?? null, platoonId: resultSoldierRow?.role.squad.platoonId ?? null, companyId: selectedCompany?.id ?? null, unitId: resultSoldierRow?.role.squad.unitId ?? null }}
      />
      <div className="mt-4"><IndividualReadinessPanel data={readinessData} scope={latestRun ? "Saved mission run snapshot" : "Current scenario preview · not persisted"} /></div>
      <div className="mt-4"><HistoricalContextPanel inputs={resultInputs} label="Historical context for these simulation inputs" /></div>
    </AppShell>
  );
}
