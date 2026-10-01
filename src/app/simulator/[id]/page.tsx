import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { runSimulation } from "@/lib/simulation";
import type { MissionInputs, PerformancePoint } from "@/lib/simulation";
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
      soldier: true,
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

  const baseline = scenario.soldier
    ? {
        baselineMobility: scenario.soldier.baselineMobility,
        baselineEndurance: scenario.soldier.baselineEndurance,
        baselineStrength: scenario.soldier.baselineStrength,
        baselineRecovery: scenario.soldier.baselineRecovery,
        experienceYears: scenario.soldier.experienceYears,
        typicalLoadKg: scenario.soldier.typicalLoadKg,
      }
    : {};

  // Always compute for explanations; prefer stored snapshots when a run exists
  const computed = runSimulation(inputs, baseline);
  const latestRun = scenario.runs[0];
  const source: "stored" | "computed" =
    latestRun && latestRun.snapshots.length > 0 ? "stored" : "computed";

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

  const scenarioPayload: SimulatorScenario = {
    id: scenario.id,
    name: scenario.name,
    terrainType: scenario.terrainType,
    altitudeMeters: scenario.altitudeMeters,
    temperatureCelsius: scenario.temperatureCelsius,
    loadKg: scenario.loadKg,
    distanceKm: scenario.distanceKm,
    durationMinutes: scenario.durationMinutes,
    restMinutes: scenario.restMinutes,
    timeOfDay: scenario.timeOfDay,
    description: scenario.description,
    soldierId: scenario.soldierId,
  };

  const soldierPayload: SimulatorSoldier | null = scenario.soldier
    ? {
        id: scenario.soldier.id,
        soldierCode: scenario.soldier.soldierCode,
        baselineMobility: scenario.soldier.baselineMobility,
        baselineEndurance: scenario.soldier.baselineEndurance,
        baselineStrength: scenario.soldier.baselineStrength,
        baselineRecovery: scenario.soldier.baselineRecovery,
        experienceYears: scenario.soldier.experienceYears,
        typicalLoadKg: scenario.soldier.typicalLoadKg,
      }
    : null;

  return (
    <AppShell
      title={`Simulator · ${scenario.name}`}
      meta={<StatusBadge tone="muted">PROTOTYPE SIMULATION</StatusBadge>}
    >
      <SimulatorClient
        scenario={scenarioPayload}
        soldier={soldierPayload}
        snapshots={snapshots}
        explanations={computed.explanations}
        source={source}
      />
    </AppShell>
  );
}
