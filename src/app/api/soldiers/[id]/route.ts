import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { soldierCreateSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const soldier = await prisma.soldier.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            squad: {
              include: { unit: true },
            },
          },
        },
        missionRuns: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { scenario: true },
        },
      },
    });

    if (!soldier) {
      return NextResponse.json({ error: "Soldier not found" }, { status: 404 });
    }

    return NextResponse.json(soldier);
  } catch {
    return NextResponse.json(
      { error: "Failed to load soldier" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = soldierCreateSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid soldier payload", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    if (data.roleId && !(await prisma.role.findUnique({ where: { id: data.roleId } }))) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    const updated = await prisma.soldier.update({
      where: { id },
      data: {
        ...data,
        assessmentDate: data.assessmentDate === undefined ? undefined : data.assessmentDate ? new Date(data.assessmentDate) : null,
        profileAssessedAt: data.profileAssessedAt === undefined ? undefined : data.profileAssessedAt ? new Date(data.profileAssessedAt) : null,
      },
      include: { role: { include: { squad: { include: { unit: true } } } } },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update soldier" }, { status: 500 });
  }
}
