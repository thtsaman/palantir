import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/primitives";
import { WhatIfClient } from "./WhatIfClient";
import { prisma } from "@/lib/prisma";
import type { MissionInputs, SoldierBaseline } from "@/lib/simulation";

export const dynamic = "force-dynamic";

export default async function WhatIfPage({ searchParams }: { searchParams: Promise<{ scenarioId?: string }> }) {
  const { scenarioId } = await searchParams;
  const [scenario, soldiers, units] = await Promise.all([
    scenarioId ? prisma.missionScenario.findUnique({ where: { id: scenarioId }, include: { soldier: true } }) : null,
    prisma.soldier.findMany({ orderBy: { soldierCode: "asc" }, select: { id: true, soldierCode: true, baselineMobility: true, baselineEndurance: true, baselineStrength: true, baselineRecovery: true, experienceYears: true, typicalLoadKg: true } }),
    prisma.unit.findMany({
      orderBy: { name: "asc" },
      include: {
        squads: {
          orderBy: { name: "asc" },
          include: {
            roles: {
              include: { soldiers: { orderBy: { soldierCode: "asc" } } },
            },
          },
        },
      },
    }),
  ]);
  const initialInputs: MissionInputs | null = scenario ? {
    terrainType: scenario.terrainType, altitudeMeters: scenario.altitudeMeters,
    temperatureCelsius: scenario.temperatureCelsius, loadKg: scenario.loadKg,
    distanceKm: scenario.distanceKm, durationMinutes: scenario.durationMinutes,
    restMinutes: scenario.restMinutes, timeOfDay: scenario.timeOfDay,
  } : null;
  const initialBaseline: Partial<SoldierBaseline> | null = scenario?.soldier ? {
    baselineMobility: scenario.soldier.baselineMobility, baselineEndurance: scenario.soldier.baselineEndurance,
    baselineStrength: scenario.soldier.baselineStrength, baselineRecovery: scenario.soldier.baselineRecovery,
    experienceYears: scenario.soldier.experienceYears, typicalLoadKg: scenario.soldier.typicalLoadKg,
  } : null;
  return (
    <AppShell
      title="What-If · Comparison"
      meta={<StatusBadge tone="muted">PROTOTYPE SIMULATION</StatusBadge>}
    >
      <WhatIfClient initialInputs={initialInputs} initialBaseline={initialBaseline} initialSoldierId={scenario?.soldierId ?? null} initialScenarioName={scenario?.name ?? null} soldiers={soldiers} groupOptions={units.flatMap((unit) => [
        { id: unit.id, groupType: "UNIT" as const, label: unit.name, members: unit.squads.flatMap((squad) => squad.roles.flatMap((role) => role.soldiers)) },
        ...unit.squads.map((squad) => ({ id: squad.id, groupType: "SQUAD" as const, label: `${unit.name} / ${squad.name}`, members: squad.roles.flatMap((role) => role.soldiers) })),
      ])} />
    </AppShell>
  );
}
