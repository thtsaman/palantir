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
        displayName: parsed.data.displayName ?? null,
        ageYears: parsed.data.ageYears ?? null,
        heightCm: parsed.data.heightCm ?? null,
        weightKg: parsed.data.weightKg ?? null,
        fitnessAssessment: parsed.data.fitnessAssessment ?? null,
        assessmentDate: parsed.data.assessmentDate ? new Date(parsed.data.assessmentDate) : null,
        assessmentSource: parsed.data.assessmentSource ?? null,
        profileProvenance: parsed.data.profileProvenance ?? "USER_ENTERED",
        profileSource: parsed.data.profileSource ?? null,
        profileAssessedAt: parsed.data.profileAssessedAt ? new Date(parsed.data.profileAssessedAt) : null,
        mobilityProvenance: parsed.data.mobilityProvenance ?? "USER_ENTERED",
        enduranceProvenance: parsed.data.enduranceProvenance ?? "USER_ENTERED",
        strengthProvenance: parsed.data.strengthProvenance ?? "USER_ENTERED",
        recoveryProvenance: parsed.data.recoveryProvenance ?? "USER_ENTERED",
        typicalLoadProvenance: parsed.data.typicalLoadProvenance ?? "USER_ENTERED",
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
