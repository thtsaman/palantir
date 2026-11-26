"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MissionInputs } from "@/lib/simulation";
import { HISTORICAL_COMPARISON_METHOD } from "@/lib/simulation/historical-context";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { HistoricalPatternsPanel } from "@/components/historical/HistoricalPatternsPanel";

type Match = {
  id: string; title: string; region: string; recordedAt: string; operationDate: string | null; missionCategory: string | null; adversaryContext: string | null; isDemo: boolean; terrainType: string | null;
  altitudeBand: string | null; temperatureBand: string | null; durationMinutes: number | null; timeOfDay: string | null;
  similarityPercent: number; matchingAttributes: Array<{ label: string; scenarioValue: string; historicalValue: string }>;
  differences: Array<{ label: string; scenarioValue: string; historicalValue: string }>;
  missingAttributes: string[]; comparableAttributeCount: number; dataCompletenessPercent: number; sufficientEvidence: boolean;
  explanation: string; limitations: string[]; lessons: Array<{ id: string; title: string; description: string; category: string; sourcePassage: string | null; extractionMode: string; editedDuringReview: boolean }>;
  sourceDocument: { id: string; originalFilename: string; fileType: string | null; uploadedAt: string } | null;
};

export function HistoricalContextPanel({ inputs, label = "Historical context", compact = false }: { inputs: MissionInputs; label?: string; compact?: boolean }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch("/api/historical-context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inputs) });
        const data = await response.json() as { matches?: Match[]; consideredApprovedRecordCount?: number; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Historical comparison failed.");
        if (!cancelled) { setMatches(data.matches ?? []); setCount(data.consideredApprovedRecordCount ?? 0); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Historical comparison failed."); }
      finally { if (!cancelled) setLoading(false); }
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [inputs]);

  return <><Panel className={compact ? "!p-4 space-y-3 border-[var(--cyan)]/20" : "!p-5 space-y-4 border-[var(--cyan)]/20"}>
    <SectionHeader title={label} subtitle="Approved historical evidence · separate from current modeled estimates" action={<StatusBadge tone="cyan">EVIDENCE</StatusBadge>} />
    <p className="text-[10px] text-[var(--gray-500)]">Method {HISTORICAL_COMPARISON_METHOD.version}: weighted similarities across documented attributes. Terrain .25, altitude .20, temperature .15, duration .15, time of day .10, carried load .15. Numeric tolerances: 1,500 m, 15 °C, 240 min, 15 kg. Categorical values must match exactly. Missing values are excluded; at least two comparable attributes are required. Computed on demand from currently approved records; comparisons are not saved into simulation runs and can change after record edits. Similarity is not a success or failure prediction.</p>
    {loading ? <p className="text-[12px] text-[var(--gray-500)]">Comparing approved historical records…</p> : error ? <p className="text-[12px] text-rose-200">{error}</p> : matches.length === 0 ? <p className="text-[12px] text-[var(--gray-400)]">{count ? "No approved records have at least two comparable documented attributes for these inputs." : "No approved historical records are available yet."}</p> : <div className="space-y-3">{matches.map((match) => <article key={match.id} className="space-y-2 rounded border border-[var(--border)] bg-[#090f1b] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><Link href={`/operations/${match.id}`} className="text-[13px] font-medium text-[var(--cyan)] hover:underline">{match.title}</Link><div className="text-[10px] text-[var(--gray-500)]">{match.region} · event {match.operationDate ? new Date(match.operationDate).toLocaleDateString() : "date not documented"} · record added {new Date(match.recordedAt).toLocaleDateString()}</div>{match.missionCategory ? <div className="text-[10px] text-[var(--gray-400)]">{match.missionCategory}</div> : null}</div><div className="flex items-center gap-2">{match.isDemo ? <StatusBadge tone="muted">SYNTHETIC TRAINING</StatusBadge> : null}<StatusBadge>{match.dataCompletenessPercent}% documented coverage</StatusBadge><span className="mono text-[13px] text-[var(--white)]">{match.similarityPercent}%</span></div></div>
      <p className="text-[11px] text-[var(--gray-300)]">{match.explanation}</p>
      {match.matchingAttributes.length ? <div className="text-[11px] text-[var(--gray-400)]"><span className="text-[var(--cyan)]">Comparable:</span> {match.matchingAttributes.map((attribute) => `${attribute.label} (${attribute.historicalValue} ↔ ${attribute.scenarioValue})`).join(" · ")}</div> : null}
      {match.differences.length ? <div className="text-[11px] text-[var(--gray-400)]"><span className="text-amber-200">Differences:</span> {match.differences.map((attribute) => `${attribute.label} (${attribute.historicalValue} ↔ ${attribute.scenarioValue})`).join(" · ")}</div> : null}
      <div className="text-[10px] text-[var(--gray-500)]">Historical conditions: {match.terrainType ?? "terrain unknown"} · altitude {match.altitudeBand ?? "unknown"} · temperature {match.temperatureBand ?? "unknown"} · duration {match.durationMinutes === null ? "unknown" : `${match.durationMinutes} min`} · time {match.timeOfDay ?? "unknown"}</div>
      {match.adversaryContext ? <div className="rounded bg-[var(--ink)] px-2 py-1.5 text-[10px] text-[var(--gray-400)]">Descriptive opposition context only · excluded from simulation: {match.adversaryContext}</div> : null}
      {match.lessons.length ? <ul className="space-y-1 border-t border-[var(--border)] pt-2">{match.lessons.slice(0, 3).map((lesson) => <li key={lesson.id} className="text-[11px] text-[var(--gray-300)]"><span className="text-[var(--white)]">{lesson.title}</span> · {lesson.description} <span className="text-[10px] text-[var(--gray-500)]">({lesson.extractionMode.toLowerCase()}{lesson.editedDuringReview ? ", edited in review" : ""})</span>{lesson.sourcePassage ? <blockquote className="mt-1 border-l border-[var(--gray-500)] pl-2 text-[10px] text-[var(--gray-500)]">Source passage: “{lesson.sourcePassage}”</blockquote> : null}</li>)}</ul> : <p className="border-t border-[var(--border)] pt-2 text-[10px] text-[var(--gray-500)]">No approved lessons attached.</p>}
      <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-2 text-[10px]">{match.sourceDocument ? <a className="text-[var(--cyan)] hover:underline" href={`/api/operations/documents/${match.sourceDocument.id}/file`} target="_blank" rel="noreferrer">Source document: {match.sourceDocument.originalFilename}</a> : <span className="text-[var(--gray-500)]">No original source document is linked.</span>}<span className="text-[var(--gray-500)]">{match.comparableAttributeCount}/6 attributes comparable. {match.missingAttributes.length ? `Excluded: ${match.missingAttributes.join(", ")}.` : "No comparison fields missing."}</span></div>
    </article>)}</div>}
  </Panel><HistoricalPatternsPanel inputs={inputs} compact /></>;
}
