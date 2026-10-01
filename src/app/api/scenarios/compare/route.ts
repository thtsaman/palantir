import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareScenarios } from "@/lib/simulation";
import type { MissionInputs, SoldierBaseline } from "@/lib/simulation";
import { compareScenariosSchema } from "@/lib/validation/schemas";

function toInputs(
  s: {
    terrainType: MissionInputs["terrainType"];
    altitudeMeters: number;
    temperatureCelsius: number;
    loadKg: number;
    distanceKm: number;
    durationMinutes: number;
    restMinutes: number;
    timeOfDay: MissionInputs["timeOfDay"];
  }
): MissionInputs {
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

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = compareScenariosSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid compare payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    let soldier: Partial<SoldierBaseline> | undefined;
    if (parsed.data.soldierId) {
      const row = await prisma.soldier.findUnique({
        where: { id: parsed.data.soldierId },
      });
      if (!row) {
        return NextResponse.json(
          { error: "Soldier not found" },
          { status: 404 }
        );
      }
      soldier = {
        baselineMobility: row.baselineMobility,
        baselineEndurance: row.baselineEndurance,
        baselineStrength: row.baselineStrength,
        baselineRecovery: row.baselineRecovery,
        experienceYears: row.experienceYears,
        typicalLoadKg: row.typicalLoadKg,
      };
    }

    const comparison = compareScenarios(
      toInputs(parsed.data.baseline),
      toInputs(parsed.data.modified),
      soldier
    );

    return NextResponse.json(comparison);
  } catch {
    return NextResponse.json(
      { error: "Failed to compare scenarios" },
      { status: 500 }
    );
  }
}
