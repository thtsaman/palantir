import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const operation = await prisma.historicalOperation.findUnique({
      where: { id },
      include: { lessons: { orderBy: { createdAt: "asc" } } },
    });

    if (!operation) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(operation);
  } catch {
    return NextResponse.json(
      { error: "Failed to load operation" },
      { status: 500 }
    );
  }
}
