import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { soldierCsvRowSchema } from "@/lib/validation/schemas";

const importBodySchema = z.object({
  rows: z.array(z.unknown()),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = importBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid import payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const roles = await prisma.role.findMany({ select: { id: true, name: true } });
    const roleByName = new Map<string, string>();
    for (const r of roles) {
      const key = r.name.toLowerCase();
      if (!roleByName.has(key)) {
        roleByName.set(key, r.id);
      }
    }

    const existing = await prisma.soldier.findMany({
      select: { soldierCode: true },
    });
    const existingCodes = new Set(existing.map((s) => s.soldierCode));
    const seenInBatch = new Set<string>();

    let imported = 0;
    let failed = 0;
    let duplicates = 0;
    const errors: string[] = [];
    const preview: Array<{
      soldierCode: string;
      roleId: string;
      experienceYears: number;
      baselineMobility: number;
      baselineEndurance: number;
      baselineStrength: number;
      baselineRecovery: number;
      typicalLoadKg: number;
    }> = [];

    for (let i = 0; i < parsed.data.rows.length; i++) {
      const row = parsed.data.rows[i];
      const rowResult = soldierCsvRowSchema.safeParse(row);
      if (!rowResult.success) {
        failed += 1;
        errors.push(`Row ${i + 1}: invalid fields`);
        continue;
      }

      const data = rowResult.data;

      if (existingCodes.has(data.soldierCode) || seenInBatch.has(data.soldierCode)) {
        duplicates += 1;
        errors.push(`Row ${i + 1}: duplicate soldierCode ${data.soldierCode}`);
        continue;
      }

      const roleId = roleByName.get(data.role.toLowerCase());
      if (!roleId) {
        failed += 1;
        errors.push(`Row ${i + 1}: role "${data.role}" not found`);
        continue;
      }

      try {
        const soldier = await prisma.soldier.create({
          data: {
            soldierCode: data.soldierCode,
            roleId,
            experienceYears: data.experienceYears,
            baselineMobility: data.baselineMobility,
            baselineEndurance: data.baselineEndurance,
            baselineStrength: data.baselineStrength,
            baselineRecovery: data.baselineRecovery,
            typicalLoadKg: data.typicalLoadKg,
            status: "ACTIVE",
          },
        });
        seenInBatch.add(data.soldierCode);
        existingCodes.add(data.soldierCode);
        imported += 1;
        preview.push({
          soldierCode: soldier.soldierCode,
          roleId: soldier.roleId,
          experienceYears: soldier.experienceYears,
          baselineMobility: soldier.baselineMobility,
          baselineEndurance: soldier.baselineEndurance,
          baselineStrength: soldier.baselineStrength,
          baselineRecovery: soldier.baselineRecovery,
          typicalLoadKg: soldier.typicalLoadKg,
        });
      } catch {
        failed += 1;
        errors.push(`Row ${i + 1}: failed to create ${data.soldierCode}`);
      }
    }

    return NextResponse.json({
      imported,
      failed,
      duplicates,
      errors,
      preview,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to import soldiers" },
      { status: 500 }
    );
  }
}
