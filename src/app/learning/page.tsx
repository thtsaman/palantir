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
import { EmptyState } from "@/components/ui/primitives";
import { LibraryFilters } from "./LibraryFilters";
import { terrainLabel } from "@/lib/simulation/factors";
import { HistoricalPatternsPanel } from "@/components/historical/HistoricalPatternsPanel";
import type { Prisma } from "@prisma/client";
import { KnowledgeSearch } from "./KnowledgeSearch";

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

export default async function LearningPage({ searchParams }: { searchParams: Promise<{ q?: string; terrain?: string; condition?: string; category?: string; from?: string; to?: string }> }) {
  const filters = await searchParams;
  const q = filters.q?.trim() ?? "";
  const terrain = filters.terrain ?? "";
  const condition = filters.condition?.trim() ?? "";
  const category = filters.category?.trim() ?? "";
  const from = filters.from ?? "";
  const to = filters.to ?? "";
  const searchClauses: Prisma.HistoricalOperationWhereInput[] = [];
  if (condition) searchClauses.push({ OR: [
    { temperatureBand: { contains: condition, mode: "insensitive" } },
    { weatherSummary: { contains: condition, mode: "insensitive" } },
    { environmentalFactors: { contains: condition, mode: "insensitive" } },
    { adversaryContext: { contains: condition, mode: "insensitive" } },
  ] });
  if (category) searchClauses.push({ missionCategory: { contains: category, mode: "insensitive" } });
  if (q) searchClauses.push({ OR: [
    { title: { contains: q, mode: "insensitive" } },
    { rawReport: { contains: q, mode: "insensitive" } },
    { missionCategory: { contains: q, mode: "insensitive" } },
    { adversaryContext: { contains: q, mode: "insensitive" } },
    { lessons: { some: { reviewStatus: "APPROVED", OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ] } } },
  ] });
  const [opCount, lessonCount, scenarioCount, approvedOps, needsReviewCount, lifecycleCounts] = await Promise.all([
    prisma.historicalOperation.count({ where: { workflowStatus: "APPROVED" } }),
    prisma.operationLesson.count({ where: { reviewStatus: "APPROVED", operation: { workflowStatus: "APPROVED" } } }),
    prisma.missionScenario.count({ where: { sourceOperation: { workflowStatus: "APPROVED" } } }),
    prisma.historicalOperation.findMany({ where: {
      workflowStatus: "APPROVED",
      ...(terrain ? { terrainType: terrain as "FLAT" | "ROLLING" | "MOUNTAIN" | "STEEP_MOUNTAIN" | "MIXED" | "DESERT" | "FOREST" } : {}),
      ...(from || to ? { operationDate: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}),
      AND: searchClauses,
    }, orderBy: [{ operationDate: "desc" }, { reviewedAt: "desc" }], include: { lessons: { where: { reviewStatus: "APPROVED" } }, sourceDocument: { select: { id: true, originalFilename: true, fileType: true } } } }),
    prisma.historicalOperation.count({ where: { workflowStatus: { in: ["NEEDS_REVIEW", "PROCESSING", "EXTRACTION_COMPLETED"] } } }),
    prisma.operationLesson.groupBy({ by: ["lifecycle"], where: { reviewStatus: "APPROVED", operation: { workflowStatus: "APPROVED" } }, _count: { _all: true } }),
  ]);
  const lifecycleCount = (stage: "OBSERVATION" | "IDENTIFIED" | "ACTION_ASSIGNED" | "VALIDATED") => lifecycleCounts.find((row) => row.lifecycle === stage)?._count._all ?? 0;

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
          title="Historical Learning Library"
        description="Human-approved historical records and lessons, linked to their original documents and review provenance."
        actions={
          <>
            <Button href="/operations" variant="secondary" size="sm">
              Browse operations
            </Button>
            <Button href="/what-if" size="sm">
              What-If
            </Button>
          </>
        }
      />

      <div className="mb-4"><KnowledgeSearch /></div>

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
          <div className="mt-3 text-[12px] text-[var(--gray-500)]">{needsReviewCount} records awaiting review</div>
          <div className="border-t border-[var(--border)] pt-4">
            <div className="label-xs mb-2">Lesson lifecycle · approved records</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--gray-300)]">
              <div>Observation <span className="mono text-[var(--white)]">{lifecycleCount("OBSERVATION")}</span></div>
              <div>Lesson identified <span className="mono text-[var(--white)]">{lifecycleCount("IDENTIFIED")}</span></div>
              <div>Action assigned <span className="mono text-[var(--white)]">{lifecycleCount("ACTION_ASSIGNED")}</span></div>
              <div>Validated <span className="mono text-[var(--white)]">{lifecycleCount("VALIDATED")}</span></div>
            </div>
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

      <div className="lg:col-span-2"><HistoricalPatternsPanel /></div>

      <Panel className="!p-5" >
        <SectionHeader title="Approved historical records" subtitle="Only approved records and lessons appear in this library." action={<StatusBadge tone="cyan">{approvedOps.length} RECORDS</StatusBadge>} />
        <LibraryFilters terrain={terrain} condition={condition} category={category} from={from} to={to} q={q} />
        <div id="library" className="mt-4">{approvedOps.length === 0 ? <EmptyState title="No approved records match" description={opCount === 0 ? "Approve a reviewed operation to start building the historical learning library." : "Try broadening the search or filters."} action={<Button href="/operations" variant="secondary" size="sm">Review operations</Button>} /> : <div className="grid gap-3">{approvedOps.map((operation) => <div key={operation.id} className="rounded border border-[var(--border)] p-4 hover:border-[var(--cyan)]/40"><div className="flex flex-wrap items-center gap-2"><StatusBadge tone="cyan">APPROVED</StatusBadge><StatusBadge>{terrainLabel(operation.terrainType)}</StatusBadge>{operation.isDemo ? <StatusBadge tone="muted">SYNTHETIC TRAINING</StatusBadge> : null}<span className="text-[10px] text-[var(--gray-500)]">Event {operation.operationDate?.toLocaleDateString() ?? "date not documented"} · reviewed {operation.reviewedAt?.toLocaleDateString() ?? "date not recorded"}</span></div><h2 className="mt-2 text-[15px] font-semibold text-[var(--white)]"><Link href={`/operations/${operation.id}`} className="hover:text-[var(--cyan)]">{operation.title}</Link></h2><p className="mt-1 text-[12px] text-[var(--gray-300)]">{operation.missionCategory ? `${operation.missionCategory} · ` : ""}{operation.region} · {operation.temperatureBand} · {operation.weatherSummary}</p><p className="mt-2 line-clamp-2 text-[12px] text-[var(--gray-500)]">{operation.humanFactors}</p>{operation.adversaryContext ? <p className="mt-2 text-[11px] text-[var(--gray-500)]">Context only: {operation.adversaryContext}</p> : null}<div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--cyan)]">{operation.lessons.length} approved lessons · {operation.sourceDocument ? <span>Source: {operation.sourceDocument.originalFilename} · <a className="underline" href={`/api/operations/documents/${operation.sourceDocument.id}/file`} target="_blank" rel="noreferrer">open original</a></span> : "Legacy record, source file unavailable"}</div></div>)}</div>}</div>
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
