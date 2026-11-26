import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  PageHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { UnitMapClient, type UnitMapNode } from "./UnitMapClient";

export const dynamic = "force-dynamic";

export default async function UnitOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const scenario = await prisma.missionScenario.findUnique({
    where: { id },
    include: {
      soldier: true,
      runs: { where: { scenarioId: id }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!scenario) notFound();

  const soldierRuns = { missionRuns: { where: { scenarioId: scenario.id }, orderBy: { createdAt: "desc" as const }, take: 1 } };
  const rolesInclude = { roles: { orderBy: { name: "asc" as const }, include: { soldiers: { orderBy: { soldierCode: "asc" as const }, include: soldierRuns } } } };
  const units = await prisma.unit.findMany({
    orderBy: { name: "asc" },
    include: {
      squads: {
        orderBy: { name: "asc" },
        include: rolesInclude,
      },
      companies: { orderBy: { name: "asc" }, include: { platoons: { orderBy: { name: "asc" }, include: { squads: { orderBy: { name: "asc" }, include: rolesInclude } } } } },
    },
  });

  const nodes: UnitMapNode[] = [];
  const soldierMetrics: Record<
    string,
    {
      id: string;
      soldierCode: string;
      roleName: string;
      squadName: string;
      unitName: string;
      index: number;
      mobility: number;
      endurance: number;
      strength: number;
      recovery: number;
      fatigue: number | null;
      source: "SIMULATED" | "BASELINE";
    }
  > = {};

  let yCursor = 35;
  const unitX = 85, companyX = 245, platoonX = 405, squadX = 565, roleX = 725, soldierX = 885;
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  const averageMap = (nodeId: string, values: number[]) => { const node = nodes.find((item) => item.id === nodeId); if (node) node.index = average(values); };

  const buildSquadNodes = (squad: (typeof units)[number]["squads"][number] | (typeof units)[number]["companies"][number]["platoons"][number]["squads"][number], unit: (typeof units)[number], parentId: string, yX: number[]) => {
    const squadY = yCursor;
    const squadValues: number[] = [];
    const squadNodeId = `squad-${squad.id}`;
    nodes.push({ id: squadNodeId, kind: "squad", label: squad.name, sublabel: squad.code, x: squadX, y: squadY, index: null, parentId });
    for (const role of squad.roles) {
      const roleNodeId = `role-${role.id}`;
      const roleValues: number[] = [];
      nodes.push({ id: roleNodeId, kind: "role", label: role.name, sublabel: role.code, x: roleX, y: yCursor, index: null, parentId: squadNodeId });
      if (role.soldiers.length === 0) yCursor += 56;
      for (const soldier of role.soldiers) {
        const latest = soldier.missionRuns[0];
        const baselineAvg = Math.round((soldier.baselineMobility + soldier.baselineEndurance + soldier.baselineStrength + soldier.baselineRecovery) / 4);
        const index = latest?.finalPerformance ?? baselineAvg;
        const source = latest?.finalPerformance != null ? "SIMULATED" as const : "BASELINE" as const;
        nodes.push({ id: `soldier-${soldier.id}`, kind: "soldier", label: soldier.soldierCode, sublabel: role.name, x: soldierX, y: yCursor, index: Math.round(index), parentId: roleNodeId, soldierId: soldier.id, source });
        soldierMetrics[soldier.id] = { id: soldier.id, soldierCode: soldier.soldierCode, roleName: role.name, squadName: squad.name, unitName: unit.name, index: Math.round(index), mobility: Math.round(latest?.finalMobility ?? soldier.baselineMobility), endurance: Math.round(latest?.finalEndurance ?? soldier.baselineEndurance), strength: soldier.baselineStrength, recovery: soldier.baselineRecovery, fatigue: latest?.finalFatigue ?? null, source };
        roleValues.push(index); squadValues.push(index); yX.push(index); yCursor += 56;
      }
      averageMap(roleNodeId, roleValues);
    }
    averageMap(squadNodeId, squadValues);
    if (!squad.roles.length) yCursor += 56;
  };

  for (const unit of units) {
    const unitSoldiers: number[] = [];
    const unitNodeId = `unit-${unit.id}`;
    nodes.push({ id: unitNodeId, kind: "unit", label: unit.name, sublabel: unit.code, x: unitX, y: yCursor, index: null });
    for (const company of unit.companies) {
      const companyNodeId = `company-${company.id}`;
      const companyValues: number[] = [];
      nodes.push({ id: companyNodeId, kind: "company", label: company.name, sublabel: company.code, x: companyX, y: yCursor, index: null, parentId: unitNodeId });
      for (const platoon of company.platoons) {
        const platoonNodeId = `platoon-${platoon.id}`;
        const platoonValues: number[] = [];
        nodes.push({ id: platoonNodeId, kind: "platoon", label: platoon.name, sublabel: platoon.code, x: platoonX, y: yCursor, index: null, parentId: companyNodeId });
        for (const squad of platoon.squads) buildSquadNodes(squad, unit, platoonNodeId, platoonValues);
        averageMap(platoonNodeId, platoonValues); companyValues.push(...platoonValues); unitSoldiers.push(...platoonValues);
      }
      averageMap(companyNodeId, companyValues); if (!company.platoons.length) yCursor += 56;
    }
    for (const squad of unit.squads) { const squadValues: number[] = []; buildSquadNodes(squad, unit, unitNodeId, squadValues); unitSoldiers.push(...squadValues); }
    averageMap(unitNodeId, unitSoldiers);

    yCursor += 28;
  }

  const allIndexes = Object.values(soldierMetrics).map((s) => s.index);
  const unitCapability = average(allIndexes);
  const mapSourceCounts = { simulated: Object.values(soldierMetrics).filter((member) => member.source === "SIMULATED").length, baseline: Object.values(soldierMetrics).filter((member) => member.source === "BASELINE").length };

  const canvasHeight = Math.max(420, yCursor + 40);
  const countMembers = (squads: Array<{ roles: Array<{ soldiers: unknown[] }> }>) => squads.reduce((sum, squad) => sum + squad.roles.reduce((roleSum, role) => roleSum + role.soldiers.length, 0), 0);
  const groupOptions = units.flatMap((unit) => {
    const nestedSquads = unit.companies.flatMap((company) => company.platoons.flatMap((platoon) => platoon.squads));
    return [
      { id: unit.id, groupType: "UNIT" as const, label: unit.name, memberCount: countMembers([...unit.squads, ...nestedSquads]) },
      ...unit.companies.flatMap((company) => [
        { id: company.id, groupType: "COMPANY" as const, label: `${unit.name} / ${company.name}`, memberCount: countMembers(company.platoons.flatMap((platoon) => platoon.squads)) },
        ...company.platoons.map((platoon) => ({ id: platoon.id, groupType: "PLATOON" as const, label: `${unit.name} / ${company.name} / ${platoon.name}`, memberCount: countMembers(platoon.squads) })),
      ]),
      ...unit.squads.map((squad) => ({ id: squad.id, groupType: "SQUAD" as const, label: `${unit.name} / ${squad.name}`, memberCount: countMembers([squad]) })),
      ...nestedSquads.map((squad) => ({ id: squad.id, groupType: "SQUAD" as const, label: `${unit.name} / ${squad.name}`, memberCount: countMembers([squad]) })),
    ];
  });

  return (
    <AppShell
      title={`Unit Readiness · ${scenario.name}`}
      meta={
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] text-[var(--gray-300)]">
            {scenario.name.toUpperCase()}
          </span>
          <StatusBadge tone="muted">PROTOTYPE SIMULATION</StatusBadge>
        </div>
      }
    >
      <PageHeader
        eyebrow="MISSION PROFILE / UNIT VIEW"
        title="Unit Readiness"
        description="Individual performance → role → squad → unit capability"
        actions={
          <>
            <Button href={`/simulator/${scenario.id}`} size="sm">
              Open Simulator
            </Button>
            <Button href="/missions" variant="secondary" size="sm">
              All Missions
            </Button>
          </>
        }
      />

      <UnitMapClient
        nodes={nodes}
        soldierMetrics={soldierMetrics}
        unitCapability={unitCapability}
        mapSourceCounts={mapSourceCounts}
        canvasHeight={canvasHeight}
        scenarioId={scenario.id}
        highlightSoldierId={scenario.soldierId}
        missionInputs={{ terrainType: scenario.terrainType, altitudeMeters: scenario.altitudeMeters, temperatureCelsius: scenario.temperatureCelsius, loadKg: scenario.loadKg, distanceKm: scenario.distanceKm, durationMinutes: scenario.durationMinutes, restMinutes: scenario.restMinutes, timeOfDay: scenario.timeOfDay }}
        groupOptions={groupOptions}
      />
    </AppShell>
  );
}
