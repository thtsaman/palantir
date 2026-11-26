import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareHistoricalScenario, type HistoricalCandidate } from "@/lib/simulation/historical-context";
import { similarScenariosSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = similarScenariosSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid similar-scenarios payload", details: parsed.error.flatten() }, { status: 400 });
  const { terrainType, altitudeMeters, temperatureCelsius, durationMinutes, timeOfDay, loadKg, limit = 5 } = parsed.data;
  const records = await prisma.historicalOperation.findMany({ where: { workflowStatus: "APPROVED" }, select: {
    id: true, title: true, region: true, terrainType: true, altitudeBand: true, temperatureBand: true,
    operationDate: true, missionCategory: true, adversaryContext: true, isDemo: true,
    durationMinutes: true, timeOfDay: true, rawReport: true, extractionJson: true, createdAt: true,
    lessons: { where: { reviewStatus: "APPROVED" }, select: { id: true, title: true, description: true, category: true, sourcePassage: true, extractionMode: true, editedDuringReview: true } },
    sourceDocument: { select: { id: true, originalFilename: true, fileType: true, uploadedAt: true } },
  } });
  const matches = compareHistoricalScenario({ terrainType, altitudeMeters, temperatureCelsius, durationMinutes, timeOfDay, loadKg: loadKg ?? null }, records as HistoricalCandidate[], limit);
  return NextResponse.json({ matches: matches.map((match) => ({ id: match.id, title: match.title, similarity: match.similarityPercent, explanation: match.explanation, matchingAttributes: match.matchingAttributes, differences: match.differences, missingAttributes: match.missingAttributes })) });
}
