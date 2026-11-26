import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  fields: z.object({ title: z.string().trim().min(1).max(160), operationDate: z.string().date().nullable().optional(), missionCategory: z.string().trim().max(120).nullable().optional(), adversaryContext: z.string().trim().max(2000).nullable().optional(), region: z.string().trim().min(1).max(160), terrainType: z.enum(["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"]), altitudeBand: z.string().trim().min(1).max(100), temperatureBand: z.string().trim().min(1).max(100), durationMinutes: z.number().int().min(1).max(43200), timeOfDay: z.enum(["DAY", "NIGHT"]), weatherSummary: z.string().max(2000), personnelSummary: z.string().max(2000), environmentalFactors: z.string().max(4000), humanFactors: z.string().max(4000), reviewNotes: z.string().max(4000).optional() }).optional(),
  lessons: z.array(z.object({ id: z.string(), title: z.string().trim().min(1).max(160), description: z.string().trim().min(1).max(2000), category: z.string().trim().min(1).max(80), reviewStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]) })).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review payload.", details: parsed.error.flatten() }, { status: 400 });
  const operation = await prisma.historicalOperation.findUnique({ where: { id }, include: { lessons: true } });
  if (!operation) return NextResponse.json({ error: "Operation not found." }, { status: 404 });
  if (operation.workflowStatus === "APPROVED" || operation.workflowStatus === "REJECTED") return NextResponse.json({ error: "Review is already complete." }, { status: 409 });
  const data = parsed.data;
  const approve = data.decision === "APPROVE";
  await prisma.$transaction(async (tx) => {
    if (data.lessons) for (const lesson of data.lessons) {
      if (!operation.lessons.some((existing) => existing.id === lesson.id)) throw new Error("LESSON_MISMATCH");
      const original = operation.lessons.find((existing) => existing.id === lesson.id)!;
      await tx.operationLesson.update({ where: { id: lesson.id }, data: {
        title: lesson.title, description: lesson.description, category: lesson.category,
        reviewStatus: lesson.reviewStatus, editedDuringReview: original.title !== lesson.title || original.description !== lesson.description || original.category !== lesson.category,
        lifecycle: lesson.reviewStatus === "APPROVED" && original.lifecycle === "OBSERVATION" ? "IDENTIFIED" : original.lifecycle,
      } });
    }
    const finalStates = operation.lessons.map((lesson) => data.lessons?.find((edited) => edited.id === lesson.id)?.reviewStatus ?? lesson.reviewStatus);
    if (approve && finalStates.some((status) => status === "PENDING")) throw new Error("LESSONS_PENDING");
    await tx.historicalOperation.update({ where: { id }, data: {
      ...data.fields,
      ...(data.fields?.operationDate !== undefined ? { operationDate: data.fields.operationDate ? new Date(`${data.fields.operationDate}T00:00:00.000Z`) : null } : {}),
      workflowStatus: approve ? "APPROVED" : "REJECTED",
      status: approve ? "REVIEWED" : "REJECTED",
      reviewNotes: data.fields?.reviewNotes ?? null,
      reviewedAt: new Date(),
    } });
  }).catch((error: unknown) => { throw error; });
  if (data.decision === "APPROVE") {
    await prisma.operationSourceDocument.updateMany({ where: { operationId: id }, data: { status: "LINKED", extractionError: null } });
  }
  return NextResponse.json({ success: true, status: approve ? "APPROVED" : "REJECTED" });
}
