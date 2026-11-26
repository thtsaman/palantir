import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discoverHistoricalPatterns, HISTORICAL_PATTERN_METHOD } from "@/lib/historical/patterns";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const terrain = params.get("terrain")?.trim();
  const from = params.get("from");
  const to = params.get("to");
  const q = params.get("q")?.trim();
  const category = params.get("category")?.trim();
  const dateFilter = from || to ? { operationDate: { ...(from && Number.isFinite(Date.parse(from)) ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to && Number.isFinite(Date.parse(to)) ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {};
  const approved = await prisma.historicalOperation.findMany({
    where: { workflowStatus: "APPROVED", ...dateFilter,
      ...(terrain && ["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"].includes(terrain) ? { terrainType: terrain as "FLAT" | "ROLLING" | "MOUNTAIN" | "STEEP_MOUNTAIN" | "MIXED" | "DESERT" | "FOREST" } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { region: { contains: q, mode: "insensitive" } }, { missionCategory: { contains: q, mode: "insensitive" } }, { adversaryContext: { contains: q, mode: "insensitive" } }, { environmentalFactors: { contains: q, mode: "insensitive" } }, { humanFactors: { contains: q, mode: "insensitive" }, }, { lessons: { some: { reviewStatus: "APPROVED", OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } } }] } : {}),
      ...(category ? { lessons: { some: { reviewStatus: "APPROVED", category: { contains: category, mode: "insensitive" } } } } : {}),
    },
    orderBy: [{ operationDate: "desc" }, { reviewedAt: "desc" }],
    select: { id: true, title: true, region: true, terrainType: true, altitudeBand: true, temperatureBand: true, durationMinutes: true, timeOfDay: true, weatherSummary: true, environmentalFactors: true, humanFactors: true, createdAt: true, reviewedAt: true, operationDate: true, missionCategory: true, isDemo: true,
      lessons: { where: { reviewStatus: "APPROVED" }, select: { id: true, title: true, description: true, category: true, sourcePassage: true } },
      sourceDocument: { select: { id: true, originalFilename: true } },
    },
  });
  const patterns = discoverHistoricalPatterns(approved);
  return NextResponse.json({ methodology: HISTORICAL_PATTERN_METHOD, approvedRecordCount: approved.length, patterns, insufficientEvidence: patterns.length === 0 });
}
