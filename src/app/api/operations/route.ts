import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { terrainSchema, timeOfDaySchema } from "@/lib/validation/schemas";

const lessonCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  category: z.string().optional().default("GENERAL"),
});

const operationCreateSchema = z.object({
  title: z.string().min(1),
  region: z.string().min(1),
  terrainType: terrainSchema,
  altitudeBand: z.string().min(1),
  temperatureBand: z.string().min(1),
  durationMinutes: z.number().int().min(1),
  timeOfDay: timeOfDaySchema,
  weatherSummary: z.string().min(1),
  personnelSummary: z.string().min(1),
  environmentalFactors: z.string().min(1),
  humanFactors: z.string().min(1),
  rawReport: z.string().optional().nullable(),
  aiSummary: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "STRUCTURED", "REVIEWED"]).optional(),
  isDemo: z.boolean().optional(),
  lessons: z.array(lessonCreateSchema).optional(),
});

export async function GET() {
  try {
    const operations = await prisma.historicalOperation.findMany({
      include: {
        _count: { select: { lessons: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = operations.map(({ _count, ...op }) => ({
      ...op,
      lessonsCount: _count.lessons,
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json(
      { error: "Failed to list operations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = operationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid operation payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { lessons, ...data } = parsed.data;

    const operation = await prisma.historicalOperation.create({
      data: {
        title: data.title,
        region: data.region,
        terrainType: data.terrainType,
        altitudeBand: data.altitudeBand,
        temperatureBand: data.temperatureBand,
        durationMinutes: data.durationMinutes,
        timeOfDay: data.timeOfDay,
        weatherSummary: data.weatherSummary,
        personnelSummary: data.personnelSummary,
        environmentalFactors: data.environmentalFactors,
        humanFactors: data.humanFactors,
        rawReport: data.rawReport ?? null,
        aiSummary: data.aiSummary ?? null,
        status: data.status ?? "STRUCTURED",
        isDemo: data.isDemo ?? true,
        lessons: lessons
          ? {
              create: lessons.map((l) => ({
                title: l.title,
                description: l.description,
                category: l.category,
              })),
            }
          : undefined,
      },
      include: { lessons: true },
    });

    return NextResponse.json(operation, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create operation" },
      { status: 500 }
    );
  }
}
