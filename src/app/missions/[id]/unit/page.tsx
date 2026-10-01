import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  PageHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { aggregateCapability } from "@/lib/simulation/aggregation";
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
      runs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!scenario) notFound();

  const units = await prisma.unit.findMany({
    orderBy: { name: "asc" },
    include: {
      squads: {
        orderBy: { name: "asc" },
        include: {
          roles: {
            orderBy: { name: "asc" },
            include: {
              soldiers: {
                orderBy: { soldierCode: "asc" },
                include: {
                  missionRuns: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
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
      source: "SIMULATED" | "BASELINE";
    }
  > = {};

  let yCursor = 35;
  const unitX = 95;
  const squadX = 285;
  const roleX = 475;
  const soldierX = 665;

  for (const unit of units) {
    const unitSoldiers: number[] = [];
    const unitY = yCursor;

    nodes.push({
      id: `unit-${unit.id}`,
      kind: "unit",
      label: unit.name,
      sublabel: unit.code,
      x: unitX,
      y: unitY,
      index: 0,
    });

    for (const squad of unit.squads) {
      const squadY = yCursor;
      const squadSoldiers: number[] = [];

      nodes.push({
        id: `squad-${squad.id}`,
        kind: "squad",
        label: squad.name,
        sublabel: squad.code,
        x: squadX,
        y: squadY,
        index: 0,
        parentId: `unit-${unit.id}`,
      });

      for (const role of squad.roles) {
        const roleY = yCursor;
        const roleSoldiers: number[] = [];

        nodes.push({
          id: `role-${role.id}`,
          kind: "role",
          label: role.name,
          sublabel: role.code,
          x: roleX,
          y: roleY,
          index: 0,
          parentId: `squad-${squad.id}`,
        });

        if (role.soldiers.length === 0) {
          yCursor += 56;
        }

        for (const soldier of role.soldiers) {
          const latest = soldier.missionRuns[0];
          const baselineAvg = Math.round(
            (soldier.baselineMobility +
              soldier.baselineEndurance +
              soldier.baselineStrength +
              soldier.baselineRecovery) /
              4
          );
          const index = latest?.finalPerformance
            ? Math.round(latest.finalPerformance)
            : baselineAvg;
          const source = latest?.finalPerformance ? "SIMULATED" : "BASELINE";

          nodes.push({
            id: `soldier-${soldier.id}`,
            kind: "soldier",
            label: soldier.soldierCode,
            sublabel: role.name,
            x: soldierX,
            y: yCursor,
            index,
            parentId: `role-${role.id}`,
            soldierId: soldier.id,
            source,
          });

          soldierMetrics[soldier.id] = {
            id: soldier.id,
            soldierCode: soldier.soldierCode,
            roleName: role.name,
            squadName: squad.name,
            unitName: unit.name,
            index,
            mobility: latest?.finalMobility
              ? Math.round(latest.finalMobility)
              : soldier.baselineMobility,
            endurance: latest?.finalEndurance
              ? Math.round(latest.finalEndurance)
              : soldier.baselineEndurance,
            strength: soldier.baselineStrength,
            recovery: soldier.baselineRecovery,
            source,
          };

          roleSoldiers.push(index);
          squadSoldiers.push(index);
          unitSoldiers.push(index);
          yCursor += 56;
        }

        const roleNode = nodes.find((n) => n.id === `role-${role.id}`);
        if (roleNode) {
          roleNode.index = aggregateCapability(
            roleSoldiers.map((performance) => ({ performance }))
          );
        }
      }

      const squadNode = nodes.find((n) => n.id === `squad-${squad.id}`);
      if (squadNode) {
        squadNode.index = aggregateCapability(
          squadSoldiers.map((performance) => ({ performance }))
        );
      }
    }

    const unitNode = nodes.find((n) => n.id === `unit-${unit.id}`);
    if (unitNode) {
      unitNode.index = aggregateCapability(
        unitSoldiers.map((performance) => ({ performance }))
      );
    }

    yCursor += 28;
  }

  const allIndexes = Object.values(soldierMetrics).map((s) => s.index);
  const unitCapability = aggregateCapability(
    allIndexes.map((performance) => ({ performance }))
  );

  const canvasHeight = Math.max(420, yCursor + 40);

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
        canvasHeight={canvasHeight}
        scenarioName={scenario.name}
        scenarioId={scenario.id}
        highlightSoldierId={scenario.soldierId}
      />
    </AppShell>
  );
}
