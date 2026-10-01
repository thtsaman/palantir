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

  const soldier = soldierId
    ? await prisma.soldier.findUnique({
        where: { id: soldierId },
        select: {
          id: true,
          soldierCode: true,
          typicalLoadKg: true,
          role: { select: { name: true } },
        },
      })
    : null;

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
      />
    </AppShell>
  );
}
