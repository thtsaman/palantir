import { NextResponse } from "next/server";
import type { HistoricalCandidate } from "@/lib/simulation/historical-context";
import { compareHistoricalScenario, HISTORICAL_COMPARISON_METHOD } from "@/lib/simulation/historical-context";
import { prisma } from "@/lib/prisma";
import { terrainSchema, timeOfDaySchema } from "@/lib/validation/schemas";
import { z } from "zod";

const inputSchema = z.object({ terrainType: terrainSchema.nullable().default(null), altitudeMeters: z.number().min(0).max(9000).nullable().default(null), temperatureCelsius: z.number().min(-50).max(55).nullable().default(null), durationMinutes: z.number().int().min(1).max(24 * 60).nullable().default(null), timeOfDay: timeOfDaySchema.nullable().default(null), loadKg: z.number().min(0).max(50).nullable().default(null) });

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid historical comparison inputs.", details: parsed.error.flatten() }, { status: 400 });
  const records = await prisma.historicalOperation.findMany({
    where: { workflowStatus: "APPROVED" },
    select: {
      id: true, title: true, region: true, terrainType: true, altitudeBand: true, temperatureBand: true,
      operationDate: true, missionCategory: true, adversaryContext: true, isDemo: true,
      durationMinutes: true, timeOfDay: true, rawReport: true, extractionJson: true, createdAt: true,
      lessons: { where: { reviewStatus: "APPROVED" }, select: { id: true, title: true, description: true, category: true, sourcePassage: true, extractionMode: true, editedDuringReview: true } },
      sourceDocument: { select: { id: true, originalFilename: true, fileType: true, uploadedAt: true } },
    },
    orderBy: { reviewedAt: "desc" },
  });
  const matches = compareHistoricalScenario(parsed.data, records as HistoricalCandidate[]);
  return NextResponse.json({ method: HISTORICAL_COMPARISON_METHOD, matches, consideredApprovedRecordCount: records.length, insufficientEvidence: matches.length === 0 });
}
