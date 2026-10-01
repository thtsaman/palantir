import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSimulation } from "@/lib/simulation";
import type { MissionInputs, SoldierBaseline } from "@/lib/simulation";
import { simulationRequestSchema } from "@/lib/validation/schemas";

function toMissionInputs(s: {
  terrainType: MissionInputs["terrainType"];
  altitudeMeters: number;
  temperatureCelsius: number;
  loadKg: number;
  distanceKm: number;
  durationMinutes: number;
  restMinutes: number;
  timeOfDay: MissionInputs["timeOfDay"];
}): MissionInputs {
  return {
    terrainType: s.terrainType,
    altitudeMeters: s.altitudeMeters,
    temperatureCelsius: s.temperatureCelsius,
    loadKg: s.loadKg,
    distanceKm: s.distanceKm,
    durationMinutes: s.durationMinutes,
    restMinutes: s.restMinutes,
    timeOfDay: s.timeOfDay,
  };
}

function toBaseline(s: {
  baselineMobility: number;
  baselineEndurance: number;
  baselineStrength: number;
  baselineRecovery: number;
  experienceYears: number;
  typicalLoadKg: number;
}): SoldierBaseline {
  return {
    baselineMobility: s.baselineMobility,
    baselineEndurance: s.baselineEndurance,
    baselineStrength: s.baselineStrength,
    baselineRecovery: s.baselineRecovery,
    experienceYears: s.experienceYears,
    typicalLoadKg: s.typicalLoadKg,
  };
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = simulationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid simulation request",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { scenarioId, soldierId, scenario: scenarioInput } = parsed.data;

    let scenarioRecord: {
      id: string;
      terrainType: MissionInputs["terrainType"];
      altitudeMeters: number;
      temperatureCelsius: number;
      loadKg: number;
      distanceKm: number;
      durationMinutes: number;
      restMinutes: number;
      timeOfDay: MissionInputs["timeOfDay"];
      soldierId: string | null;
    };

    if (scenarioId) {
      const existing = await prisma.missionScenario.findUnique({
        where: { id: scenarioId },
        include: { soldier: true },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Scenario not found" },
          { status: 404 }
        );
      }
      scenarioRecord = existing;
    } else if (scenarioInput) {
      const created = await prisma.missionScenario.create({
        data: {
          name: scenarioInput.name,
          terrainType: scenarioInput.terrainType,
          altitudeMeters: scenarioInput.altitudeMeters,
          temperatureCelsius: scenarioInput.temperatureCelsius,
          loadKg: scenarioInput.loadKg,
          distanceKm: scenarioInput.distanceKm,
          durationMinutes: scenarioInput.durationMinutes,
          restMinutes: scenarioInput.restMinutes,
          timeOfDay: scenarioInput.timeOfDay,
          description: scenarioInput.description,
          soldierId: scenarioInput.soldierId ?? soldierId ?? null,
          sourceOperationId: scenarioInput.sourceOperationId ?? null,
        },
      });
      scenarioRecord = created;
    } else {
      return NextResponse.json(
        { error: "Provide scenarioId or scenario" },
        { status: 400 }
      );
    }

    const resolvedSoldierId =
      soldierId ?? scenarioRecord.soldierId ?? scenarioInput?.soldierId ?? null;

    let baseline: Partial<SoldierBaseline> = {};
    if (resolvedSoldierId) {
      const soldier = await prisma.soldier.findUnique({
        where: { id: resolvedSoldierId },
      });
      if (!soldier) {
        return NextResponse.json(
          { error: "Soldier not found" },
          { status: 404 }
        );
      }
      baseline = toBaseline(soldier);
    }

    const inputs = toMissionInputs(scenarioRecord);
    const result = runSimulation(inputs, baseline);
    const now = new Date();

    const run = await prisma.missionRun.create({
      data: {
        scenarioId: scenarioRecord.id,
        soldierId: resolvedSoldierId,
        status: "COMPLETED",
        startedAt: now,
        completedAt: now,
        finalFatigue: result.final.fatigue,
        finalMobility: result.final.mobility,
        finalEndurance: result.final.endurance,
        finalPerformance: result.final.performance,
        snapshots: {
          create: result.snapshots.map((p) => ({
            timeMinutes: p.timeMinutes,
            fatigue: p.fatigue,
            mobility: p.mobility,
            endurance: p.endurance,
            performance: p.performance,
          })),
        },
      },
      include: {
        snapshots: { orderBy: { timeMinutes: "asc" } },
        scenario: true,
        soldier: true,
      },
    });

    return NextResponse.json({
      run,
      snapshots: run.snapshots,
      explanations: result.explanations,
      factors: result.factors,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to run simulation" },
      { status: 500 }
    );
  }
}
