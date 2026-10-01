import { NextResponse } from "next/server";
import type { TerrainType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseAltitudeBand,
  parseTemperatureBand,
  rankSimilarScenarios,
} from "@/lib/simulation";
import type { SimilarityInput } from "@/lib/simulation";
import { similarScenariosSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = similarScenariosSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid similar-scenarios payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      terrainType,
      altitudeMeters,
      temperatureCelsius,
      durationMinutes,
      timeOfDay,
      loadKg = 18,
      restMinutes = 15,
      limit = 5,
    } = parsed.data;

    const query: SimilarityInput = {
      terrainType,
      altitudeMeters,
      temperatureCelsius,
      durationMinutes,
      timeOfDay,
      loadKg,
      restMinutes,
    };

    const operations = await prisma.historicalOperation.findMany({
      select: {
        id: true,
        title: true,
        terrainType: true,
        altitudeBand: true,
        temperatureBand: true,
        durationMinutes: true,
        timeOfDay: true,
      },
    });

    const candidates = operations.map((op) => ({
      id: op.id,
      title: op.title,
      terrainType: op.terrainType as TerrainType,
      altitudeMeters: parseAltitudeBand(op.altitudeBand),
      temperatureCelsius: parseTemperatureBand(op.temperatureBand),
      durationMinutes: op.durationMinutes,
      timeOfDay: op.timeOfDay,
      loadKg: 18,
      restMinutes: 15,
    }));

    const ranked = rankSimilarScenarios(query, candidates, limit);

    const matches = ranked.map((m) => ({
      id: m.id,
      title: m.title,
      similarity: Math.round(m.similarity * 100),
    }));

    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json(
      { error: "Failed to rank similar scenarios" },
      { status: 500 }
    );
  }
}
