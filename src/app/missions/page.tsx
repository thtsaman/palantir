import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { terrainLabel } from "@/lib/simulation/factors";
import { formatHoursLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const scenarios = await prisma.missionScenario.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      soldier: true,
      runs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <AppShell
      title="Missions · Scenarios"
      meta={<StatusBadge tone="muted">DEMO DATA</StatusBadge>}
    >
      <PageHeader
        eyebrow="Mission Scenarios"
        title="Missions"
        description="Configure environmental and load conditions, then simulate human-performance response."
        actions={
          <Button href="/missions/new" size="sm">
            + New Mission
          </Button>
        }
      />

      {scenarios.length === 0 ? (
        <EmptyState
          title="No mission scenarios"
          description="Create a mission configuration to run the performance simulator."
          action={<Button href="/missions/new">Create Mission</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {scenarios.map((s) => {
            const run = s.runs[0];
            return (
              <Panel key={s.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone="cyan">SIMULATED</StatusBadge>
                      <StatusBadge tone="muted">{s.timeOfDay}</StatusBadge>
                      {s.soldier ? (
                        <StatusBadge>SOLDIER {s.soldier.soldierCode}</StatusBadge>
                      ) : (
                        <StatusBadge tone="muted">GENERIC BASELINE</StatusBadge>
                      )}
                    </div>
                    <h2 className="text-[18px] font-semibold tracking-tight text-[var(--white)]">
                      {s.name}
                    </h2>
                    <p className="mt-1 text-[12px] text-[var(--gray-500)]">
                      {s.description ?? "Mission condition set for relative performance modelling."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px]">
                      <Cond label="Terrain" value={terrainLabel(s.terrainType)} />
                      <Cond label="Altitude" value={`${s.altitudeMeters} m`} mono />
                      <Cond label="Temp" value={`${s.temperatureCelsius}°C`} mono />
                      <Cond label="Load" value={`${s.loadKg} kg`} mono />
                      <Cond label="Distance" value={`${s.distanceKm} km`} mono />
                      <Cond
                        label="Duration"
                        value={formatHoursLabel(s.durationMinutes)}
                        mono
                      />
                      <Cond label="Rest" value={`${s.restMinutes} min`} mono />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="label-xs mb-1">Latest Index</div>
                      <div className="mono tabular text-[32px] leading-none text-[var(--cyan)]">
                        {run ? Math.round(run.finalPerformance ?? 0) : "—"}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button href={`/simulator/${s.id}`} size="sm">
                        Open Simulator
                      </Button>
                      <Button
                        href={`/missions/${s.id}/unit`}
                        variant="secondary"
                        size="sm"
                      >
                        Unit View
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <div className="mt-6 text-[12px] text-[var(--gray-500)]">
        Prefer a blank configuration?{" "}
        <Link href="/missions/new" className="text-[var(--cyan)] hover:underline">
          Open mission builder
        </Link>
      </div>
    </AppShell>
  );
}

function Cond({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-[var(--gray-500)]">{label} </span>
      <span className={mono ? "mono tabular text-[var(--off-white)]" : "text-[var(--off-white)]"}>
        {value}
      </span>
    </div>
  );
}
