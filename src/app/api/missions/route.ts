import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { missionScenarioSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const scenarios = await prisma.missionScenario.findMany({
      include: {
        soldier: true,
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            finalFatigue: true,
            finalMobility: true,
            finalEndurance: true,
            finalPerformance: true,
            completedAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const withLatestRun = scenarios.map(({ runs, ...rest }) => ({
      ...rest,
      latestRun: runs[0] ?? null,
    }));

    return NextResponse.json(withLatestRun);
  } catch {
    return NextResponse.json(
      { error: "Failed to list missions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = missionScenarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid mission payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.soldierId) {
      const soldier = await prisma.soldier.findUnique({
        where: { id: data.soldierId },
      });
      if (!soldier) {
        return NextResponse.json(
          { error: "Soldier not found" },
          { status: 404 }
        );
      }
    }

    if (data.sourceOperationId) {
      const op = await prisma.historicalOperation.findUnique({
        where: { id: data.sourceOperationId },
      });
      if (!op) {
        return NextResponse.json(
          { error: "Source operation not found" },
          { status: 404 }
        );
      }
    }

    const scenario = await prisma.missionScenario.create({
      data: {
        name: data.name,
        terrainType: data.terrainType,
        altitudeMeters: data.altitudeMeters,
        temperatureCelsius: data.temperatureCelsius,
        loadKg: data.loadKg,
        distanceKm: data.distanceKm,
        durationMinutes: data.durationMinutes,
        restMinutes: data.restMinutes,
        timeOfDay: data.timeOfDay,
        description: data.description,
        soldierId: data.soldierId ?? null,
        sourceOperationId: data.sourceOperationId ?? null,
      },
      include: { soldier: true },
    });

    return NextResponse.json(scenario, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create mission" },
      { status: 500 }
    );
  }
}
