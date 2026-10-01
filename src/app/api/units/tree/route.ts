import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const units = await prisma.unit.findMany({
      include: {
        squads: {
          include: {
            roles: {
              include: {
                soldiers: {
                  orderBy: { soldierCode: "asc" },
                },
              },
              orderBy: { name: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(units);
  } catch {
    return NextResponse.json(
      { error: "Failed to load unit tree" },
      { status: 500 }
    );
  }
}
