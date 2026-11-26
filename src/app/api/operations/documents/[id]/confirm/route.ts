import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { operationDocumentConfirmationSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = operationDocumentConfirmationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Complete the required reviewed operation fields.", details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const operation = await prisma.$transaction(async (tx) => {
      const source = await tx.operationSourceDocument.findUnique({ where: { id } });
      if (!source) throw new Error("SOURCE_NOT_FOUND");
      if (source.status !== "PREVIEW_READY" || source.operationId) throw new Error("SOURCE_ALREADY_CONFIRMED");
      if (data.reviewedText.trim().length < 20) throw new Error("EMPTY_REVIEWED_TEXT");
      const created = await tx.historicalOperation.create({ data: {
        title: data.title,
        region: data.region,
        terrainType: data.terrainType,
        altitudeBand: data.altitudeBand,
        temperatureBand: data.temperatureBand,
        durationMinutes: data.durationMinutes,
        timeOfDay: data.timeOfDay,
        weatherSummary: data.weatherSummary,
        personnelSummary: data.personnelSummary,
        environmentalFactors: data.environmentalFactors,
        humanFactors: data.humanFactors,
        rawReport: data.reviewedText,
        aiSummary: null,
        status: "DRAFT",
        isDemo: false,
      } });
      const linked = await tx.operationSourceDocument.updateMany({ where: { id, status: "PREVIEW_READY", operationId: null }, data: { status: "LINKED", operationId: created.id } });
      if (linked.count !== 1) throw new Error("SOURCE_ALREADY_CONFIRMED");
      return created;
    });
    return NextResponse.json({ operation }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SOURCE_NOT_FOUND") return NextResponse.json({ error: "Document preview was not found." }, { status: 404 });
    if (error instanceof Error && error.message === "SOURCE_ALREADY_CONFIRMED") return NextResponse.json({ error: "This document has already been confirmed." }, { status: 409 });
    return NextResponse.json({ error: "Could not save the reviewed report." }, { status: 500 });
  }
}
