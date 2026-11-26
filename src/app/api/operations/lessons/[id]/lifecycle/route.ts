import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  lifecycle: z.enum(["OBSERVATION", "IDENTIFIED", "ACTION_ASSIGNED", "VALIDATED"]),
  actionOwner: z.string().trim().max(160).optional().default(""),
  actionDueDate: z.string().date().optional().nullable(),
  validationNotes: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid lesson lifecycle update." }, { status: 400 });
  const lesson = await prisma.operationLesson.findUnique({ where: { id }, include: { operation: { select: { workflowStatus: true } } } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  if (lesson.operation.workflowStatus !== "APPROVED" || lesson.reviewStatus !== "APPROVED") return NextResponse.json({ error: "Approve the source record and lesson before assigning or validating an action." }, { status: 409 });
  const data = parsed.data;
  if (data.lifecycle === "ACTION_ASSIGNED" && !data.actionOwner) return NextResponse.json({ error: "Add an action owner before marking the lesson action assigned." }, { status: 400 });
  if (data.lifecycle === "VALIDATED" && !data.validationNotes) return NextResponse.json({ error: "Add validation notes before marking the action validated." }, { status: 400 });
  const updated = await prisma.operationLesson.update({ where: { id }, data: {
    lifecycle: data.lifecycle,
    actionOwner: data.actionOwner || null,
    actionDueDate: data.actionDueDate ? new Date(`${data.actionDueDate}T00:00:00.000Z`) : null,
    validationNotes: data.validationNotes || null,
    validatedAt: data.lifecycle === "VALIDATED" ? new Date() : null,
  } });
  return NextResponse.json({ lesson: updated });
}
