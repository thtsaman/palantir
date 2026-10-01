import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  PageHeader,
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FLOW = [
  {
    id: "past",
    label: "PAST",
    detail: "Historical operations enter memory",
    href: "/operations",
    cta: "Browse operations",
  },
  {
    id: "observation",
    label: "OBSERVATION",
    detail: "Conditions and human factors structured",
    href: "/operations",
    cta: "Open library",
  },
  {
    id: "lesson",
    label: "LESSON",
    detail: "Reusable guidance for similar missions",
    href: "/operations",
    cta: "View lessons",
  },
  {
    id: "similar",
    label: "SIMILAR SCENARIO",
    detail: "Condition matching ranks related records",
    href: "/operations",
    cta: "Find matches",
  },
  {
    id: "simulation",
    label: "SIMULATION",
    detail: "Replay human-state response over time",
    href: "/simulator",
    cta: "Open simulator",
  },
] as const;

export default async function LearningPage() {
  const [opCount, lessonCount, scenarioCount] = await Promise.all([
    prisma.historicalOperation.count(),
    prisma.operationLesson.count(),
    prisma.missionScenario.count({
      where: { sourceOperationId: { not: null } },
    }),
  ]);

  const recentOps = await prisma.historicalOperation.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
    include: { _count: { select: { lessons: true } } },
  });

  return (
    <AppShell
      title="Learning · Operational Memory"
      meta={<StatusBadge tone="muted">MEMORY LOOP</StatusBadge>}
    >
      <PageHeader
        eyebrow="Operational Memory"
        title="Learning"
        description="Past operations become observations, lessons, similar scenarios, and new simulations."
        actions={
          <>
            <Button href="/operations" variant="secondary" size="sm">
              Operations
            </Button>
            <Button href="/what-if" size="sm">
              What-If
            </Button>
          </>
        }
      />

      <Panel className="!p-6 mb-6 overflow-hidden">
        <SectionHeader
          title="Memory Loop"
          subtitle="PAST → OBSERVATION → LESSON → SIMILAR SCENARIO → SIMULATION"
          action={<StatusBadge tone="cyan">FLOW</StatusBadge>}
        />

        {/* Desktop horizontal */}
        <div className="mt-8 hidden lg:block">
          <div className="relative flex items-start justify-between gap-2 px-2">
            <div
              className="absolute left-[8%] right-[8%] top-[15px] h-px bg-[var(--border-strong)]"
              aria-hidden
            />
            <div
              className="absolute left-[8%] right-[8%] top-[15px] h-px bg-gradient-to-r from-transparent via-[var(--cyan)]/50 to-transparent"
              aria-hidden
            />
            {FLOW.map((step, i) => (
              <Link
                key={step.id}
                href={step.href}
                className="group relative z-[1] flex w-[18%] flex-col items-center text-center"
              >
                <span
                  className={cn(
                    "mb-4 flex h-[30px] w-[30px] items-center justify-center rounded-full border bg-[var(--ink)] text-[11px] mono tabular transition-colors",
                    i === FLOW.length - 1
                      ? "border-[var(--cyan)] text-[var(--cyan)]"
                      : "border-[var(--border-strong)] text-[var(--gray-300)] group-hover:border-[var(--cyan)]/50 group-hover:text-[var(--cyan)]"
                  )}
                >
                  {i + 1}
                </span>
                <span className="text-[11px] font-semibold tracking-[0.12em] text-[var(--white)]">
                  {step.label}
                </span>
                <span className="mt-2 max-w-[140px] text-[11px] leading-snug text-[var(--gray-500)]">
                  {step.detail}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile / tablet vertical */}
        <div className="mt-4 space-y-0 lg:hidden">
          {FLOW.map((step, i) => (
            <div key={step.id} className="flex gap-4">
              <div className="flex w-8 flex-col items-center">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] mono tabular",
                    i === FLOW.length - 1
                      ? "border-[var(--cyan)] text-[var(--cyan)]"
                      : "border-[var(--border-strong)] text-[var(--gray-300)]"
                  )}
                >
                  {i + 1}
                </span>
                {i < FLOW.length - 1 ? (
                  <span
                    className="my-1 w-px flex-1 bg-[var(--border-strong)]"
                    aria-hidden
                  />
                ) : null}
              </div>
              <Link href={step.href} className="mb-6 flex-1 pb-1">
                <div className="text-[12px] font-semibold tracking-[0.1em] text-[var(--white)]">
                  {step.label}
                </div>
                <p className="mt-1 text-[12px] text-[var(--gray-500)]">
                  {step.detail}
                </p>
                <span className="mt-1 inline-block text-[11px] text-[var(--cyan)]">
                  {step.cta} →
                </span>
              </Link>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel className="!p-5 space-y-5">
          <SectionHeader title="Memory Snapshot" />
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Operations" value={opCount} />
            <Metric label="Lessons" value={lessonCount} />
            <Metric label="Linked Sims" value={scenarioCount} />
          </div>
          <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
            <Button href="/operations#ingest" variant="secondary" className="w-full">
              Ingest Report
            </Button>
            <Button href="/simulator" className="w-full">
              Open Simulator
            </Button>
          </div>
        </Panel>

        <Panel className="!p-5">
          <SectionHeader
            title="Recent Memory"
            subtitle="Latest structured operations in the loop"
          />
          {recentOps.length === 0 ? (
            <p className="text-[13px] text-[var(--gray-500)]">
              No operations yet. Ingest a report to begin.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentOps.map((op) => (
                <li key={op.id}>
                  <Link
                    href={`/operations/${op.id}`}
                    className="flex items-center justify-between gap-3 rounded-[6px] border border-[var(--border)] px-3 py-2.5 transition-colors hover:border-[var(--cyan)]/35"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] text-[var(--white)]">
                        {op.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--gray-500)]">
                        {op.region} · {op._count.lessons} lessons
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-[var(--cyan)]">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="label-xs mb-1">{label}</div>
      <div className="mono tabular text-[28px] font-medium leading-none text-[var(--cyan)]">
        {value}
      </div>
    </div>
  );
}
