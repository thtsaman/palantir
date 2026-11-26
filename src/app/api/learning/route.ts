import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { terrainSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const querySchema = z.object({ q: z.string().trim().max(200).default(""), terrain: terrainSchema.optional(), condition: z.string().trim().max(100).optional(), category: z.string().trim().max(120).optional(), from: z.string().date().optional(), to: z.string().date().optional() });

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid library filters." }, { status: 400 });
  const { q, terrain, condition, category, from, to } = parsed.data;
  const searchClauses: Prisma.HistoricalOperationWhereInput[] = [];
  if (condition) searchClauses.push({ OR: [
    { temperatureBand: { contains: condition, mode: "insensitive" } },
    { weatherSummary: { contains: condition, mode: "insensitive" } },
    { environmentalFactors: { contains: condition, mode: "insensitive" } },
    { adversaryContext: { contains: condition, mode: "insensitive" } },
  ] });
  if (category) searchClauses.push({ missionCategory: { contains: category, mode: "insensitive" } });
  if (q) searchClauses.push({ OR: [
    { title: { contains: q, mode: "insensitive" } },
    { rawReport: { contains: q, mode: "insensitive" } },
    { humanFactors: { contains: q, mode: "insensitive" } },
    { missionCategory: { contains: q, mode: "insensitive" } },
    { adversaryContext: { contains: q, mode: "insensitive" } },
    { lessons: { some: { reviewStatus: "APPROVED", OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ] } } },
  ] });
  const operations = await prisma.historicalOperation.findMany({
    where: {
      workflowStatus: "APPROVED",
      ...(terrain ? { terrainType: terrain } : {}),
      ...(from || to ? { operationDate: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}),
      AND: searchClauses,
    },
    orderBy: [{ operationDate: "desc" }, { reviewedAt: "desc" }],
    include: { lessons: { where: { reviewStatus: "APPROVED" }, orderBy: { createdAt: "asc" } }, sourceDocument: { select: { id: true, originalFilename: true, fileType: true, fileSizeBytes: true, uploadedAt: true } } },
  });
  return NextResponse.json(operations);
}
