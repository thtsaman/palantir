import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { missionInputsSchema } from "@/lib/validation/schemas";
import { simulateRoster } from "@/lib/simulation/group";
import type { MissionInputs, SoldierBaseline } from "@/lib/simulation";

const GROUP_TYPES = ["UNIT", "COMPANY", "PLATOON", "SQUAD"] as const;
type GroupType = typeof GROUP_TYPES[number];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const groupType = url.searchParams.get("groupType");
  const groupId = url.searchParams.get("groupId");
  const scenarioId = url.searchParams.get("scenarioId");
  if (!groupId || !GROUP_TYPES.includes(groupType as GroupType)) return NextResponse.json({ error: "A unit, company, platoon or squad selection is required." }, { status: 400 });
  const runs = await prisma.groupSimulationRun.findMany({ where: { groupType: groupType!, groupId, scenarioId: scenarioId || undefined }, orderBy: { createdAt: "desc" }, take: 10, include: { members: { orderBy: { soldierCode: "asc" } } } });
  return NextResponse.json(runs.map((run) => {
    const saved = run.aggregateSnapshot as { aggregate: Record<string, unknown>; timeline: unknown[] };
    return { id: run.id, groupLabel: run.groupLabelSnapshot, includedCount: run.includedCount, excludedCount: run.excludedCount, incompleteCount: run.incompleteCount, syntheticCount: run.members.filter((member) => member.profileQuality === "SYNTHETIC_DEMO").length, aggregate: saved.aggregate, timeline: saved.timeline, modelVersion: run.modelVersion, inputs: run.inputsSnapshot, members: run.members.map((member) => ({ id: member.soldierId ?? member.id, soldierCode: member.soldierCode, roleName: member.roleNameSnapshot ?? "Unknown / unassigned", included: member.included, profileQuality: member.profileQuality, baseline: member.baselineSnapshot, final: member.outputSnapshot, timeline: member.timelineSnapshot ?? [] })) };
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { groupType?: GroupType; groupId?: string; scenarioId?: string; inputs?: unknown };
    if (!body.groupType || !GROUP_TYPES.includes(body.groupType) || !body.groupId) return NextResponse.json({ error: "Select a unit, company, platoon or squad." }, { status: 400 });
    const parsed = missionInputsSchema.safeParse(body.inputs);
    if (!parsed.success) return NextResponse.json({ error: "Invalid mission inputs", details: parsed.error.flatten() }, { status: 400 });
    const scenario = body.scenarioId ? await prisma.missionScenario.findUnique({ where: { id: body.scenarioId } }) : null;
    if (body.scenarioId && !scenario) return NextResponse.json({ error: "Mission scenario not found." }, { status: 404 });
    let groupLabel: string;
    let unitId: string;
    let squadId: string | null = null;
    let roster: Array<{ id: string; soldierCode: string; status: string; roleName: string; baselineMobility: number; baselineEndurance: number; baselineStrength: number; baselineRecovery: number; experienceYears: number; typicalLoadKg: number; mobilityProvenance: string | null; enduranceProvenance: string | null; strengthProvenance: string | null; recoveryProvenance: string | null; typicalLoadProvenance: string | null }>;
    const includeSquadMembers = { roles: { include: { soldiers: true } } } as const;
    if (body.groupType === "UNIT") {
      const group = await prisma.unit.findUnique({ where: { id: body.groupId }, include: { squads: { include: includeSquadMembers }, companies: { include: { platoons: { include: { squads: { include: includeSquadMembers } } } } } } });
      if (!group) return NextResponse.json({ error: "Selected group not found." }, { status: 404 });
      groupLabel = group.name;
      unitId = group.id;
      const squads = [...group.squads, ...group.companies.flatMap((company) => company.platoons.flatMap((platoon) => platoon.squads))];
      roster = squads.flatMap((squad) => squad.roles.flatMap((role) => role.soldiers.map((soldier) => ({ ...soldier, roleName: role.name }))));
    } else if (body.groupType === "COMPANY") {
      const group = await prisma.company.findUnique({ where: { id: body.groupId }, include: { unit: true, platoons: { include: { squads: { include: includeSquadMembers } } } } });
      if (!group) return NextResponse.json({ error: "Selected company not found." }, { status: 404 });
      groupLabel = `${group.unit.name} / ${group.name}`; unitId = group.unitId;
      roster = group.platoons.flatMap((platoon) => platoon.squads.flatMap((squad) => squad.roles.flatMap((role) => role.soldiers.map((soldier) => ({ ...soldier, roleName: role.name })))));
    } else if (body.groupType === "PLATOON") {
      const group = await prisma.platoon.findUnique({ where: { id: body.groupId }, include: { company: { include: { unit: true } }, squads: { include: includeSquadMembers } } });
      if (!group) return NextResponse.json({ error: "Selected platoon not found." }, { status: 404 });
      groupLabel = `${group.company.unit.name} / ${group.company.name} / ${group.name}`; unitId = group.company.unitId;
      roster = group.squads.flatMap((squad) => squad.roles.flatMap((role) => role.soldiers.map((soldier) => ({ ...soldier, roleName: role.name }))));
    } else {
      const group = await prisma.squad.findUnique({ where: { id: body.groupId }, include: { roles: { include: { soldiers: true } } } });
      if (!group) return NextResponse.json({ error: "Selected group not found." }, { status: 404 });
      groupLabel = group.name;
      unitId = group.unitId;
      squadId = group.id;
      roster = group.roles.flatMap((role) => role.soldiers.map((soldier) => ({ ...soldier, roleName: role.name })));
    }
    const inputs: MissionInputs = parsed.data;
    const result = simulateRoster(inputs, roster.map((soldier) => ({
      id: soldier.id, soldierCode: soldier.soldierCode, roleName: soldier.roleName, status: soldier.status,
      baseline: { baselineMobility: soldier.baselineMobility, baselineEndurance: soldier.baselineEndurance, baselineStrength: soldier.baselineStrength, baselineRecovery: soldier.baselineRecovery, experienceYears: soldier.experienceYears, typicalLoadKg: soldier.typicalLoadKg } satisfies SoldierBaseline,
      provenanceComplete: Boolean(soldier.mobilityProvenance && soldier.enduranceProvenance && soldier.strengthProvenance && soldier.recoveryProvenance && soldier.typicalLoadProvenance),
      synthetic: [soldier.mobilityProvenance, soldier.enduranceProvenance, soldier.strengthProvenance, soldier.recoveryProvenance, soldier.typicalLoadProvenance].includes("SYNTHETIC_DEMO"),
    })));
    const created = await prisma.groupSimulationRun.create({ data: {
      groupType: body.groupType, groupId: body.groupId,
      unitId,
      squadId,
      groupLabelSnapshot: `${groupLabel} (${roster.length} rostered)`,
      scenarioId: scenario?.id ?? null,
      inputsSnapshot: inputs as unknown as Prisma.InputJsonObject,
      modelVersion: result.modelVersion,
      includedCount: result.includedCount, excludedCount: result.excludedCount, incompleteCount: result.incompleteCount,
      aggregateSnapshot: { aggregate: result.aggregate, timeline: result.timeline } as unknown as Prisma.InputJsonObject,
      members: { create: result.members.map((member) => ({
        soldierId: member.id, soldierCode: member.soldierCode, roleNameSnapshot: member.roleName, included: member.included,
        exclusionReason: member.exclusionReason, profileQuality: member.profileQuality,
        baselineSnapshot: member.baseline as unknown as Prisma.InputJsonObject | undefined,
        outputSnapshot: member.final as unknown as Prisma.InputJsonObject | undefined,
        timelineSnapshot: member.timeline as unknown as Prisma.InputJsonArray,
      })) },
    }, select: { id: true, createdAt: true } });
    return NextResponse.json({ id: created.id, ...result, persistedAt: created.createdAt, groupLabel, inputs });
  } catch {
    return NextResponse.json({ error: "Failed to run group simulation." }, { status: 500 });
  }
}
