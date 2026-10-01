import { NextResponse } from "next/server";
import type { TerrainType, TimeOfDay } from "@prisma/client";
import { z } from "zod";
import { analyzeOperationReport } from "@/lib/ai/analyze-operation";
import { prisma } from "@/lib/prisma";
import {
  analyzeOperationSchema,
  type OperationAnalysisResult,
} from "@/lib/validation/schemas";

const requestSchema = analyzeOperationSchema.extend({
  save: z.boolean().optional(),
});

const VALID_TERRAIN: TerrainType[] = [
  "FLAT",
  "ROLLING",
  "MOUNTAIN",
  "STEEP_MOUNTAIN",
  "MIXED",
];

function parseDurationToMinutes(duration: string): number {
  const hours = duration.match(/(\d+(?:\.\d+)?)\s*h/i);
  if (hours?.[1]) return Math.max(1, Math.round(Number(hours[1]) * 60));
  const mins = duration.match(/(\d+)\s*m(?:in)?/i);
  if (mins?.[1]) return Math.max(1, Number(mins[1]));
  const bare = duration.match(/(\d+)/);
  if (bare?.[1]) return Math.max(1, Number(bare[1]) * 60);
  return 480;
}

function toTerrainType(value: string): TerrainType {
  const normalized = value.toUpperCase().replace(/\s+/g, "_");
  if ((VALID_TERRAIN as string[]).includes(normalized)) {
    return normalized as TerrainType;
  }
  return "MOUNTAIN";
}

function toTimeOfDay(value: string): TimeOfDay {
  return /night/i.test(value) ? "NIGHT" : "DAY";
}

function asText(value: string | string[]): string {
  return Array.isArray(value) ? value.join("; ") : value;
}

async function persistAnalysis(
  rawText: string,
  result: OperationAnalysisResult
) {
  const lessons = result.lessons.map((lesson) => {
    if (typeof lesson === "string") {
      return {
        title: lesson.slice(0, 120),
        description: lesson,
        category: "GENERAL",
      };
    }
    return {
      title: lesson.title,
      description: lesson.description ?? "",
      category: lesson.category ?? "GENERAL",
    };
  });

  return prisma.historicalOperation.create({
    data: {
      title: result.title,
      region: result.region,
      terrainType: toTerrainType(String(result.terrain)),
      altitudeBand: result.altitudeBand,
      temperatureBand: result.temperatureBand,
      durationMinutes: parseDurationToMinutes(result.duration),
      timeOfDay: toTimeOfDay(String(result.timeOfDay)),
      weatherSummary: result.weather,
      personnelSummary: result.personnelSummary,
      environmentalFactors: asText(result.environmentalFactors),
      humanFactors: asText(result.observedHumanFactors),
      rawReport: rawText,
      aiSummary: result.keyObservations.join("\n"),
      status: "STRUCTURED",
      isDemo: true,
      lessons: { create: lessons },
    },
    include: { lessons: true },
  });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid analyze payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { rawText, save } = parsed.data;
    const { result, mode } = await analyzeOperationReport(rawText);

    let saved = null;
    if (save) {
      saved = await persistAnalysis(rawText, result);
    }

    return NextResponse.json({
      mode,
      result,
      ...(saved ? { operation: saved } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze operation" },
      { status: 500 }
    );
  }
}
