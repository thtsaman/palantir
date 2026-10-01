import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { soldierCreateSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const soldiers = await prisma.soldier.findMany({
      include: {
        role: {
          include: {
            squad: {
              include: { unit: true },
            },
          },
        },
      },
      orderBy: { soldierCode: "asc" },
    });
    return NextResponse.json(soldiers);
  } catch {
    return NextResponse.json(
      { error: "Failed to list soldiers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = soldierCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid soldier payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const role = await prisma.role.findUnique({
      where: { id: parsed.data.roleId },
    });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const existing = await prisma.soldier.findUnique({
      where: { soldierCode: parsed.data.soldierCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Soldier code already exists" },
        { status: 409 }
      );
    }

    const soldier = await prisma.soldier.create({
      data: {
        soldierCode: parsed.data.soldierCode,
        roleId: parsed.data.roleId,
        experienceYears: parsed.data.experienceYears,
        baselineMobility: parsed.data.baselineMobility,
        baselineEndurance: parsed.data.baselineEndurance,
        baselineStrength: parsed.data.baselineStrength,
        baselineRecovery: parsed.data.baselineRecovery,
        typicalLoadKg: parsed.data.typicalLoadKg,
        status: parsed.data.status ?? "ACTIVE",
      },
      include: {
        role: {
          include: {
            squad: {
              include: { unit: true },
            },
          },
        },
      },
    });

    return NextResponse.json(soldier, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create soldier" },
      { status: 500 }
    );
  }
}
