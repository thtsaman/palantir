import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { MissionBuilder } from "./MissionBuilder";

export const dynamic = "force-dynamic";

export default async function NewMissionPage({
  searchParams,
}: {
  searchParams: Promise<{ soldierId?: string }>;
}) {
  const { soldierId } = await searchParams;

  const [soldier, historicalRecords] = await Promise.all([soldierId
    ? await prisma.soldier.findUnique({
        where: { id: soldierId },
        select: {
          id: true,
          soldierCode: true,
          typicalLoadKg: true,
          baselineMobility: true,
          baselineEndurance: true,
          baselineStrength: true,
          baselineRecovery: true,
          experienceYears: true,
          ageYears: true,
          heightCm: true,
          weightKg: true,
          fitnessAssessment: true,
          role: { select: { name: true } },
        },
      })
    : null, prisma.historicalOperation.findMany({ where: { workflowStatus: "APPROVED" }, orderBy: [{ operationDate: "desc" }, { reviewedAt: "desc" }], select: { id: true, title: true, operationDate: true, missionCategory: true, isDemo: true } })]);

  return (
    <AppShell
      title="Missions · Configuration"
      meta={<StatusBadge tone="muted">DEMO DATA</StatusBadge>}
    >
      <PageHeader
        eyebrow="Mission Configuration"
        title="Mission Builder"
        description="Set terrain, climate, load and timeline conditions, then run a relative performance simulation."
      />
      <MissionBuilder
        soldierId={soldier?.id ?? null}
        soldierCode={soldier?.soldierCode ?? null}
        soldierRole={soldier?.role.name ?? null}
        defaultLoadKg={soldier?.typicalLoadKg ?? 18}
        soldierBaseline={soldier ? {
          baselineMobility: soldier.baselineMobility,
          baselineEndurance: soldier.baselineEndurance,
          baselineStrength: soldier.baselineStrength,
          baselineRecovery: soldier.baselineRecovery,
          experienceYears: soldier.experienceYears,
          typicalLoadKg: soldier.typicalLoadKg,
        } : null}
        unusedProfileFields={soldier ? [
          ["Age", soldier.ageYears], ["Height", soldier.heightCm], ["Weight", soldier.weightKg], ["Fitness assessment", soldier.fitnessAssessment],
        ].filter(([, value]) => value != null).map(([label]) => String(label)) : []}
        historicalRecords={historicalRecords.map((record) => ({ ...record, operationDate: record.operationDate?.toISOString().slice(0, 10) ?? null }))}
      />
    </AppShell>
  );
}
