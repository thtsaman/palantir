import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { terrainLabel } from "@/lib/simulation/factors";
import { formatHoursLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SimulatorIndexPage() {
  const scenarios = await prisma.missionScenario.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      soldier: true,
      runs: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const ordered = scenarios;

  return (
    <AppShell
      title="Simulator · Scenarios"
      meta={<StatusBadge tone="muted">PROTOTYPE SIMULATION</StatusBadge>}
    >
      <PageHeader
        eyebrow="Simulation Console"
        title="Simulator"
        description="Select a mission scenario to scrub human-performance indices across mission time."
        actions={
          <Button href="/missions/new" variant="secondary" size="sm">
            + New Mission
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState
          title="No scenarios to simulate"
          description="Create a mission configuration, then open it here to run the performance timeline."
          action={<Button href="/missions/new">Create Mission</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {ordered.map((s) => {
            const run = s.runs[0];
            return (
              <Link
                key={s.id}
                href={`/simulator/${s.id}`}
                className="panel block p-4 transition-colors hover:border-[var(--cyan)]/30 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone="muted">{s.timeOfDay}</StatusBadge>
                      {s.soldier ? (
                        <StatusBadge>SOLDIER {s.soldier.soldierCode}</StatusBadge>
                      ) : (
                        <StatusBadge tone="muted">GENERIC BASELINE</StatusBadge>
                      )}
                      {run ? <StatusBadge tone="cyan">SAVED RESULT</StatusBadge> : <StatusBadge tone="muted">PREVIEW ON OPEN</StatusBadge>}
                    </div>
                    <h2
                      className="text-[18px] font-semibold tracking-tight text-[var(--white)] sm:text-[20px]"
                    >
                      {s.name}
                    </h2>
                    <p className="mt-1 text-[12px] text-[var(--gray-500)]">
                      {s.description ??
                        "Mission condition set for relative performance modelling."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--gray-300)]">
                      <span>{terrainLabel(s.terrainType)}</span>
                      <span className="mono tabular">{s.altitudeMeters} m</span>
                      <span className="mono tabular">{s.loadKg} kg</span>
                      <span className="mono tabular">
                        {formatHoursLabel(s.durationMinutes)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="label-xs mb-1">Latest Index</div>
                    <div className="mono tabular text-[32px] leading-none text-[var(--white)]">
                      {run?.finalPerformance == null ? "—" : Math.round(run.finalPerformance)}
                    </div>
                    <div className="mt-2 text-[12px] text-[var(--cyan)]">
                      Open simulation →
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-[12px] text-[var(--gray-500)]">
        Relative simulated indices only — not clinical measurements.{" "}
        <Link href="/missions/new" className="text-[var(--cyan)] hover:underline">
          Configure a new mission
        </Link>
      </p>
    </AppShell>
  );
}
