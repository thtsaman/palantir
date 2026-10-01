"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import type { OperationAnalysisResult } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";

const LOADING_STEPS = [
  "EXTRACTING",
  "STRUCTURING",
  "IDENTIFYING CONDITIONS",
  "GENERATING LESSONS",
] as const;

type AnalyzeResponse = {
  mode: "ai" | "demo";
  result: OperationAnalysisResult;
  operation?: { id: string; title: string };
  error?: string;
};

export function ReportIngestClient() {
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);

  async function analyze() {
    setBusy(true);
    setStepIndex(0);
    setError(null);
    setResponse(null);
    const timers = LOADING_STEPS.map((_, i) =>
      window.setTimeout(() => setStepIndex(i), i * 700)
    );
    try {
      const res = await fetch("/api/operations/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, save: true }),
      });
      const data = (await res.json().catch(() => ({}))) as AnalyzeResponse;
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Report analysis failed."
        );
        return;
      }
      setResponse(data);
    } catch {
      setError("Network error while analyzing report.");
    } finally {
      timers.forEach((t) => window.clearTimeout(t));
      setBusy(false);
    }
  }

  const canSubmit = rawText.trim().length >= 20 && !busy;

  return (
    <div id="ingest">
    <Panel className="!p-5 space-y-5">
      <SectionHeader
        title="Ingest Report"
        subtitle="Paste an after-action or training report to structure operational learning"
        action={<StatusBadge tone="muted">AI-ASSISTED</StatusBadge>}
      />

      <label className="block space-y-1.5">
        <span className="label-xs">Paste report</span>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={10}
          placeholder="Paste mission/training report text (minimum 20 characters)…"
          className="w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--ink)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--off-white)] placeholder:text-[var(--gray-700)] focus:border-[var(--cyan)]/45 focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={analyze} disabled={!canSubmit}>
          {busy ? "Analyzing…" : "Analyze Report"}
        </Button>
        {busy ? (
          <span className="label-xs text-[var(--cyan)]">
            {LOADING_STEPS[stepIndex]}
          </span>
        ) : null}
      </div>

      {busy ? (
        <div className="flex flex-wrap gap-2">
          {LOADING_STEPS.map((step, i) => (
            <span
              key={step}
              className={cn(
                "rounded-[4px] border px-2 py-1 text-[10px] tracking-wide uppercase transition-colors",
                i <= stepIndex
                  ? "border-[var(--cyan)]/35 bg-[var(--cyan-dim)] text-[var(--cyan)]"
                  : "border-[var(--border)] text-[var(--gray-700)]"
              )}
            >
              {step}
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-[13px] text-[var(--gray-300)]">{error}</p>
      ) : null}

      {response ? (
        <div className="space-y-4 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="cyan">STRUCTURED OPERATION</StatusBadge>
            {response.mode === "demo" ? (
              <StatusBadge tone="muted">AI ANALYSIS: DEMO MODE</StatusBadge>
            ) : (
              <StatusBadge tone="cyan">AI ANALYSIS</StatusBadge>
            )}
          </div>

          <div>
            <h3 className="text-[18px] font-semibold text-[var(--white)]">
              {response.result.title}
            </h3>
            <p className="mt-1 text-[12px] text-[var(--gray-500)]">
              {response.result.region} · {String(response.result.terrain)} ·{" "}
              {response.result.timeOfDay}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[12px]">
            <Meta label="Altitude" value={response.result.altitudeBand} />
            <Meta label="Temperature" value={response.result.temperatureBand} />
            <Meta label="Duration" value={response.result.duration} />
            <Meta label="Weather" value={response.result.weather} />
            <Meta
              label="Personnel"
              value={response.result.personnelSummary}
            />
          </div>

          {response.result.keyObservations.length > 0 ? (
            <div>
              <div className="label-xs mb-2">Key observations</div>
              <ul className="space-y-1.5">
                {response.result.keyObservations.map((obs) => (
                  <li
                    key={obs}
                    className="border-l-2 border-[var(--cyan)]/40 pl-3 text-[13px] text-[var(--gray-300)]"
                  >
                    {obs}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {response.result.lessons.length > 0 ? (
            <div>
              <div className="label-xs mb-2">Lessons</div>
              <ul className="space-y-2">
                {response.result.lessons.map((lesson, i) => {
                  const title =
                    typeof lesson === "string" ? lesson : lesson.title;
                  const description =
                    typeof lesson === "string"
                      ? null
                      : lesson.description ?? null;
                  return (
                    <li
                      key={`${title}-${i}`}
                      className="rounded-[6px] border border-[var(--border)] px-3 py-2"
                    >
                      <div className="text-[13px] font-medium text-[var(--white)]">
                        {title}
                      </div>
                      {description ? (
                        <p className="mt-0.5 text-[12px] text-[var(--gray-500)]">
                          {description}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {response.operation ? (
            <Button href={`/operations/${response.operation.id}`} size="sm">
              Open Saved Operation
            </Button>
          ) : (
            <p className="text-[12px] text-[var(--gray-500)]">
              Analysis complete.{" "}
              <Link href="/operations" className="text-[var(--cyan)] hover:underline">
                Refresh operations list
              </Link>
            </p>
          )}
        </div>
      ) : null}
    </Panel>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
        {label}
      </div>
      <div className="mt-0.5 text-[var(--off-white)]">{value}</div>
    </div>
  );
}
