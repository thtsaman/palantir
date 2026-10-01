import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const run = await prisma.missionRun.findUnique({
      where: { id },
      include: {
        scenario: true,
        soldier: true,
        snapshots: {
          orderBy: { timeMinutes: "asc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Simulation run not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(run);
  } catch {
    return NextResponse.json(
      { error: "Failed to load simulation" },
      { status: 500 }
    );
  }
}
