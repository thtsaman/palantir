import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const scenario = await prisma.missionScenario.findUnique({
      where: { id },
      include: {
        soldier: true,
        runs: {
          orderBy: { createdAt: "desc" },
          include: {
            snapshots: {
              orderBy: { timeMinutes: "asc" },
            },
          },
        },
      },
    });

    if (!scenario) {
      return NextResponse.json(
        { error: "Mission scenario not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(scenario);
  } catch {
    return NextResponse.json(
      { error: "Failed to load mission" },
      { status: 500 }
    );
  }
}
