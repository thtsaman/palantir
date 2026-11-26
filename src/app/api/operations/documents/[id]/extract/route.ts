import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractHistoricalIntelligence } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const source = await prisma.operationSourceDocument.findUnique({ where: { id }, include: { operation: true } });
  if (!source?.operation || !source.extractedText || source.status !== "LINKED") return NextResponse.json({ error: "Confirm the Phase 4A source document before extracting." }, { status: 409 });
  if (source.operation.workflowStatus === "APPROVED" || source.operation.workflowStatus === "REJECTED") return NextResponse.json({ error: "This operation has already completed review." }, { status: 409 });
  await prisma.historicalOperation.update({ where: { id: source.operation.id }, data: { workflowStatus: "PROCESSING" } });
  try {
    const { result, mode } = await extractHistoricalIntelligence(source.extractedText);
    const lessons = result.lessons.map((lesson) => ({
      title: lesson.text.slice(0, 120), description: lesson.text, category: lesson.category ?? "DOCUMENTED",
      reviewStatus: "PENDING" as const, extractionMode: mode === "ai" ? "AI" as const : "FALLBACK" as const,
      confidence: lesson.confidence, sourcePassage: lesson.sourcePassage,
    }));
    const operation = await prisma.$transaction(async (tx) => {
      const updated = await tx.historicalOperation.update({ where: { id: source.operation!.id }, data: {
        title: result.title ?? source.operation!.title,
        region: result.location ?? source.operation!.region,
        terrainType: result.terrain ?? source.operation!.terrainType,
        altitudeBand: result.altitude ?? source.operation!.altitudeBand,
        temperatureBand: result.temperature ?? source.operation!.temperatureBand,
        durationMinutes: result.durationMinutes ?? source.operation!.durationMinutes,
        timeOfDay: result.timeOfDay ?? source.operation!.timeOfDay,
        environmentalFactors: result.environmentalChallenges.map((c) => c.text).join("; ") || source.operation!.environmentalFactors,
        humanFactors: [...result.humanPerformance, ...result.fatigueWorkload].map((c) => c.text).join("; ") || source.operation!.humanFactors,
        aiSummary: JSON.stringify({ environmentalChallenges: result.environmentalChallenges, humanPerformance: result.humanPerformance, fatigueWorkload: result.fatigueWorkload, logisticsEquipment: result.logisticsEquipment, recovery: result.recovery, outcomes: result.outcomes }),
        extractionMode: mode === "ai" ? "AI" : "FALLBACK", extractionConfidence: averageConfidence(result), extractionJson: result as never,
        workflowStatus: "NEEDS_REVIEW", status: "DRAFT",
        lessons: { create: lessons },
      }, include: { lessons: true } });
      await tx.operationSourceDocument.update({ where: { id }, data: { status: "LINKED", extractionError: null } });
      return updated;
    });
    return NextResponse.json({ operation, result, mode });
  } catch {
    await prisma.historicalOperation.update({ where: { id: source.operation.id }, data: { workflowStatus: "FAILED", reviewNotes: "Historical extraction failed. Retry or review manually." } });
    await prisma.operationSourceDocument.update({ where: { id }, data: { extractionError: "Historical extraction failed. Retry or review manually." } });
    return NextResponse.json({ error: "Historical extraction failed. The source document is retained; retry or review it manually." }, { status: 502 });
  }
}

function averageConfidence(result: Awaited<ReturnType<typeof extractHistoricalIntelligence>>["result"]) {
  const claims = Object.values(result).flatMap((value) => Array.isArray(value) ? value : []).filter((value) => typeof value === "object" && value !== null && "confidence" in value) as Array<{ confidence: number | null }>;
  const scores = claims.flatMap((claim) => claim.confidence === null ? [] : [claim.confidence]);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}
