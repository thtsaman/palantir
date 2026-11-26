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
import { ReportIngestClient } from "./ReportIngestClient";
import { DocumentSourceQueue } from "./DocumentSourceQueue";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [operations, pendingSources] = await Promise.all([prisma.historicalOperation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { lessons: true } },
      sourceDocument: { select: { originalFilename: true, fileType: true, fileSizeBytes: true, status: true } },
    },
  }), prisma.operationSourceDocument.findMany({
    where: { operationId: null },
    orderBy: { uploadedAt: "desc" },
    take: 10,
    select: { id: true, originalFilename: true, fileType: true, fileSizeBytes: true, uploadedAt: true, status: true, extractionError: true },
  })]);

  return (
    <AppShell
      title="Operations · Learning Library"
      meta={<StatusBadge tone="muted">DEMO DATA</StatusBadge>}
    >
      <PageHeader
        eyebrow="Operational Learning"
        title="Operations"
        description="Historical mission records structured for condition matching, lessons, and similar-scenario simulation."
        actions={
          <Button href="/operations/new" variant="secondary" size="sm">
            Ingest Report
          </Button>
        }
      />

      {operations.length === 0 ? (
        <EmptyState
          title="No historical operations"
          description="Ingest a report or seed the database to build operational memory."
          action={
            <Button href="/operations/new" variant="secondary">
              Paste a Report
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {operations.map((op) => (
            <Link
              key={op.id}
              href={`/operations/${op.id}`}
              className="panel block p-4 transition-colors hover:border-[var(--cyan)]/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {op.isDemo ? (
                      <StatusBadge tone="muted">DEMO DATA</StatusBadge>
                    ) : (
                      <StatusBadge tone="cyan">RECORDED</StatusBadge>
                    )}
                    <StatusBadge tone="muted">{op.status}</StatusBadge>
                    <StatusBadge tone="muted">{op.timeOfDay}</StatusBadge>
                    {op.isDemo ? <StatusBadge tone="muted">SYNTHETIC TRAINING</StatusBadge> : null}
                    {op.missionCategory ? <StatusBadge tone="muted">{op.missionCategory}</StatusBadge> : null}
                    <StatusBadge>
                      {op._count.lessons}{" "}
                      {op._count.lessons === 1 ? "LESSON" : "LESSONS"}
                    </StatusBadge>
                  </div>
                  <h2 className="text-[17px] font-semibold tracking-tight text-[var(--white)]">
                    {op.title}
                  </h2>
                  <p className="mt-1 text-[12px] text-[var(--gray-500)]">
                    {op.region}{op.operationDate ? ` · event ${op.operationDate.toLocaleDateString()}` : " · event date not documented"}
                  </p>
                  {op.sourceDocument ? <p className="mt-1 text-[11px] text-[var(--gray-500)]">Source: {op.sourceDocument.originalFilename} · {op.sourceDocument.fileType} · {(op.sourceDocument.fileSizeBytes / 1024).toFixed(0)} KB · {op.sourceDocument.status}</p> : null}
                  {op.adversaryContext ? <p className="mt-2 text-[11px] text-[var(--gray-500)]">Descriptive context only · excluded from simulation: {op.adversaryContext}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--gray-300)]">
                    <span>{terrainLabel(op.terrainType)}</span>
                    <span className="mono tabular">{op.altitudeBand}</span>
                    <span className="mono tabular">{op.temperatureBand}</span>
                    <span className="mono tabular">
                      {formatHoursLabel(op.durationMinutes)}
                    </span>
                    <span>{op.weatherSummary}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="label-xs mb-1">Learning</div>
                  <div className="text-[13px] text-[var(--cyan)]">
                    {op.status === "STRUCTURED" || op.status === "REVIEWED"
                      ? "Ready"
                      : "Draft"}
                  </div>
                  <div className="mt-2 text-[12px] text-[var(--gray-500)]">
                    Open detail →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <DocumentSourceQueue initialItems={pendingSources.map((source) => ({ ...source, uploadedAt: source.uploadedAt.toISOString() }))} />
        <ReportIngestClient />
      </div>
    </AppShell>
  );
}
