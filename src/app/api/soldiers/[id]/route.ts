import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
