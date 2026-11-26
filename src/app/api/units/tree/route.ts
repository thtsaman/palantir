import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const text = z.string().trim().min(1).max(80);
const code = z.string().trim().min(2).max(48).regex(/^[A-Za-z0-9_-]+$/);
const createSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("company"), name: text, code, unitId: z.string().min(1) }),
  z.object({ kind: z.literal("platoon"), name: text, code, companyId: z.string().min(1) }),
  z.object({ kind: z.literal("squad"), name: text, code, unitId: z.string().min(1), platoonId: z.string().min(1).nullable().optional() }),
  z.object({ kind: z.literal("role"), name: text, code, squadId: z.string().min(1) }),
]);
const assignmentSchema = z.object({ squadId: z.string().min(1), platoonId: z.string().min(1).nullable() });

export async function GET() {
  try {
    const units = await prisma.unit.findMany({
      include: {
        companies: {
          orderBy: { name: "asc" },
          include: {
            platoons: {
              orderBy: { name: "asc" },
              include: {
                squads: {
                  orderBy: { name: "asc" },
                  include: { roles: { include: { soldiers: { orderBy: { soldierCode: "asc" } } } } },
                },
              },
            },
          },
        },
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

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid organization record.", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  try {
    if (data.kind === "company") {
      if (!await prisma.unit.findUnique({ where: { id: data.unitId } })) return NextResponse.json({ error: "Unit not found." }, { status: 404 });
      return NextResponse.json(await prisma.company.create({ data: { name: data.name, code: data.code, unitId: data.unitId } }), { status: 201 });
    }
    if (data.kind === "platoon") {
      if (!await prisma.company.findUnique({ where: { id: data.companyId } })) return NextResponse.json({ error: "Company not found." }, { status: 404 });
      return NextResponse.json(await prisma.platoon.create({ data: { name: data.name, code: data.code, companyId: data.companyId } }), { status: 201 });
    }
    if (data.kind === "squad") {
      const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
      if (!unit) return NextResponse.json({ error: "Unit not found." }, { status: 404 });
      if (data.platoonId) {
        const platoon = await prisma.platoon.findUnique({ where: { id: data.platoonId }, include: { company: true } });
        if (!platoon) return NextResponse.json({ error: "Platoon not found." }, { status: 404 });
        if (platoon.company.unitId !== unit.id) return NextResponse.json({ error: "The selected platoon belongs to another unit." }, { status: 400 });
      }
      return NextResponse.json(await prisma.squad.create({ data: { name: data.name, code: data.code, unitId: unit.id, platoonId: data.platoonId ?? null } }), { status: 201 });
    }
    if (!await prisma.squad.findUnique({ where: { id: data.squadId } })) return NextResponse.json({ error: "Squad not found." }, { status: 404 });
    return NextResponse.json(await prisma.role.create({ data: { name: data.name, code: data.code, squadId: data.squadId } }), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That organization code is already in use." }, { status: 409 });
    return NextResponse.json({ error: "Failed to create organization record." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid squad assignment.", details: parsed.error.flatten() }, { status: 400 });
  const { squadId, platoonId } = parsed.data;
  const squad = await prisma.squad.findUnique({ where: { id: squadId } });
  if (!squad) return NextResponse.json({ error: "Squad not found." }, { status: 404 });
  if (platoonId) {
    const platoon = await prisma.platoon.findUnique({ where: { id: platoonId }, include: { company: true } });
    if (!platoon) return NextResponse.json({ error: "Platoon not found." }, { status: 404 });
    if (platoon.company.unitId !== squad.unitId) return NextResponse.json({ error: "The selected platoon belongs to another unit." }, { status: 400 });
  }
  return NextResponse.json(await prisma.squad.update({ where: { id: squadId }, data: { platoonId } }));
}
