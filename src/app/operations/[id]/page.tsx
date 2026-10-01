import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  PageHeader,
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import {
  parseAltitudeBand,
  parseTemperatureBand,
} from "@/lib/simulation";
import { terrainLabel } from "@/lib/simulation/factors";
import { formatHoursLabel, formatMinutes } from "@/lib/utils";
import {
  SimilarScenariosPanel,
  SimulateSimilarButton,
} from "./OperationActions";

export const dynamic = "force-dynamic";

export default async function OperationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const operation = await prisma.historicalOperation.findUnique({
    where: { id },
    include: { lessons: { orderBy: { createdAt: "asc" } } },
  });

  if (!operation) notFound();

  const altitudeMeters = parseAltitudeBand(operation.altitudeBand);
  const temperatureCelsius = parseTemperatureBand(operation.temperatureBand);

  const humanFactors = splitFactors(operation.humanFactors);
  const observations = parseObservations(
    operation.aiSummary,
    operation.rawReport
  );

  const timeline = buildTimeline(operation.durationMinutes);

  return (
    <AppShell
      title={`Operation · ${operation.title}`}
      meta={
        operation.isDemo ? (
          <StatusBadge tone="muted">DEMO DATA</StatusBadge>
        ) : (
          <StatusBadge tone="cyan">RECORDED</StatusBadge>
        )
      }
    >
      <PageHeader
        eyebrow="Historical Operation"
        title={operation.title}
        description={`${operation.region} · structured operational memory for condition matching and lessons.`}
        actions={
          <>
            <Button href="/operations" variant="ghost" size="sm">
              ← All Operations
            </Button>
            <Button href="/learning" variant="secondary" size="sm">
              Learning Map
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {operation.isDemo ? (
          <StatusBadge tone="muted">DEMO DATA</StatusBadge>
        ) : null}
        {operation.aiSummary ? (
          <StatusBadge tone="muted">AI-ASSISTED</StatusBadge>
        ) : null}
        <StatusBadge tone="cyan">{operation.status}</StatusBadge>
        <StatusBadge tone="muted">{operation.timeOfDay}</StatusBadge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr_0.9fr]">
        {/* Left: summary conditions */}
        <Panel className="!p-5 space-y-4">
          <SectionHeader
            title="Mission Conditions"
            subtitle="Environmental band from the structured record"
          />
          <div className="space-y-3 text-[13px]">
            <Cond label="Terrain" value={terrainLabel(operation.terrainType)} />
            <Cond label="Altitude band" value={operation.altitudeBand} mono />
            <Cond
              label="Altitude (mid)"
              value={`${altitudeMeters} m`}
              mono
            />
            <Cond
              label="Temperature band"
              value={operation.temperatureBand}
              mono
            />
            <Cond
              label="Temperature (mid)"
              value={`${temperatureCelsius}°C`}
              mono
            />
            <Cond
              label="Duration"
              value={formatHoursLabel(operation.durationMinutes)}
              mono
            />
            <Cond label="Time of day" value={operation.timeOfDay} />
            <Cond label="Weather" value={operation.weatherSummary} />
            <Cond label="Personnel" value={operation.personnelSummary} />
            <Cond
              label="Environment"
              value={operation.environmentalFactors}
            />
          </div>
          <div className="border-t border-[var(--border)] pt-4">
            <SimulateSimilarButton
              operationId={operation.id}
              title={operation.title}
              terrainType={operation.terrainType}
              altitudeMeters={altitudeMeters}
              temperatureCelsius={temperatureCelsius}
              durationMinutes={operation.durationMinutes}
              timeOfDay={operation.timeOfDay}
            />
          </div>
        </Panel>

        {/* Center: mission timeline */}
        <Panel className="!p-5 space-y-5">
          <SectionHeader
            title="Mission Timeline"
            subtitle="Simplified phase view across recorded duration"
          />
          <div className="relative px-1 pt-2 pb-6">
            <div
              className="absolute left-0 right-0 top-[18px] h-px bg-[var(--border-strong)]"
              aria-hidden
            />
            <div className="relative flex justify-between gap-2">
              {timeline.map((phase) => (
                <div
                  key={phase.label}
                  className="flex flex-1 flex-col items-center text-center"
                >
                  <span
                    className="relative z-[1] mb-3 h-2.5 w-2.5 rounded-full border border-[var(--cyan)] bg-[var(--ink)]"
                    style={
                      phase.active
                        ? { background: "var(--cyan)" }
                        : undefined
                    }
                    aria-hidden
                  />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--gray-300)]">
                    {phase.label}
                  </span>
                  <span className="mt-1 mono tabular text-[10px] text-[var(--gray-500)]">
                    {phase.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="Observed Human Factors" />
            <ul className="space-y-2">
              {humanFactors.map((factor) => (
                <li
                  key={factor}
                  className="border-l-2 border-[var(--cyan)]/35 pl-3 text-[13px] text-[var(--gray-300)]"
                >
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionHeader title="Key Observations" />
            {observations.length === 0 ? (
              <p className="text-[13px] text-[var(--gray-500)]">
                No structured observations recorded.
              </p>
            ) : (
              <ul className="space-y-2">
                {observations.map((obs) => (
                  <li
                    key={obs}
                    className="rounded-[6px] border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--off-white)]"
                  >
                    {obs}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {operation.rawReport ? (
            <div>
              <SectionHeader
                title="Raw Report"
                action={<StatusBadge tone="muted">SOURCE</StatusBadge>}
              />
              <pre className="mono max-h-64 overflow-auto rounded-[6px] border border-[var(--border)] bg-[var(--ink)] p-3 text-[12px] leading-relaxed text-[var(--gray-300)] whitespace-pre-wrap">
                {operation.rawReport}
              </pre>
            </div>
          ) : null}
        </Panel>

        {/* Right: learning / lessons */}
        <div className="space-y-4">
          <Panel className="!p-5 space-y-4">
            <SectionHeader
              title="Lessons"
              subtitle="Captured operational memory"
              action={
                <StatusBadge tone="cyan">
                  {operation.lessons.length} ITEMS
                </StatusBadge>
              }
            />
            {operation.lessons.length === 0 ? (
              <p className="text-[13px] text-[var(--gray-500)]">
                No lessons attached to this operation.
              </p>
            ) : (
              <ul className="space-y-3">
                {operation.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="rounded-[6px] border border-[var(--border)] px-3 py-2.5"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <StatusBadge tone="muted">{lesson.category}</StatusBadge>
                    </div>
                    <div className="text-[13px] font-medium text-[var(--white)]">
                      {lesson.title}
                    </div>
                    {lesson.description ? (
                      <p className="mt-1 text-[12px] text-[var(--gray-500)]">
                        {lesson.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <SimilarScenariosPanel
            terrainType={operation.terrainType}
            altitudeMeters={altitudeMeters}
            temperatureCelsius={temperatureCelsius}
            durationMinutes={operation.durationMinutes}
            timeOfDay={operation.timeOfDay}
            excludeId={operation.id}
          />
        </div>
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
      <div className="text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
        {label}
      </div>
      <div
        className={
          mono
            ? "mt-0.5 mono tabular text-[var(--off-white)]"
            : "mt-0.5 text-[var(--off-white)]"
        }
      >
        {value}
      </div>
    </div>
  );
}

function splitFactors(text: string): string[] {
  return text
    .split(/[;·|]|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseObservations(
  aiSummary: string | null,
  rawReport: string | null
): string[] {
  if (aiSummary) {
    const lines = aiSummary
      .split(/\n/)
      .map((s) => s.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
    if (lines.length) return lines;
  }
  if (!rawReport) return [];
  const match = rawReport.match(
    /Observations?:\s*([\s\S]*?)(?:\n\s*Lessons?:|$)/i
  );
  if (!match?.[1]) return [];
  return match[1]
    .split(/\n/)
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function buildTimeline(durationMinutes: number) {
  const markers = [
    { label: "Start", ratio: 0 },
    { label: "Approach", ratio: 0.25 },
    { label: "Peak Load", ratio: 0.55 },
    { label: "Recovery", ratio: 0.8 },
    { label: "End", ratio: 1 },
  ];
  return markers.map((m, i) => ({
    label: m.label,
    time: formatMinutes(Math.round(durationMinutes * m.ratio)),
    active: i === 0 || i === markers.length - 1,
  }));
}
