"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MissionInputs } from "@/lib/simulation";
import type { HistoricalPattern } from "@/lib/historical/patterns";
import { HISTORICAL_PATTERN_METHOD } from "@/lib/historical/patterns";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";

type Data = { approvedRecordCount: number; patterns: HistoricalPattern[]; insufficientEvidence: boolean };

export function HistoricalPatternsPanel({ inputs, compact = false }: { inputs?: MissionInputs; compact?: boolean }) {
  const [patterns, setPatterns] = useState<HistoricalPattern[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [terrain, setTerrain] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category.trim()) params.set("category", category.trim());
      if (terrain) params.set("terrain", terrain);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      try {
        const response = await fetch(`/api/historical-patterns?${params}`, { signal: controller.signal });
        const data = await response.json() as Data;
        if (!response.ok) throw new Error("Historical pattern discovery failed.");
        if (!cancelled) { setPatterns(data.patterns ?? []); setRecordCount(data.approvedRecordCount ?? 0); }
      } catch (reason) { if (!cancelled && !(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Historical pattern discovery failed."); }
      finally { if (!cancelled) setLoading(false); }
    }, 180);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [query, category, terrain, from, to]);

  const scenarioTerrain = inputs?.terrainType?.replaceAll("_", " ").toLowerCase();
  const visible = inputs ? patterns.slice().sort((a, b) => Number(b.records.some((r) => r.terrain.replaceAll("_", " ").toLowerCase() === scenarioTerrain)) - Number(a.records.some((r) => r.terrain.replaceAll("_", " ").toLowerCase() === scenarioTerrain))) : patterns;
  return <Panel className={compact ? "!p-4 space-y-3 border-[var(--cyan)]/20" : "!p-5 space-y-4 border-[var(--cyan)]/20"}>
    <SectionHeader title={inputs ? "Recurring historical patterns" : "Historical pattern discovery"} subtitle="Evidence-backed summaries from approved reports and lessons" action={<StatusBadge tone="cyan">{recordCount} APPROVED RECORDS</StatusBadge>} />
    <p className="text-[10px] text-[var(--gray-500)]">Dates shown are event dates when documented; review timestamps are kept separately. Synthetic training examples are labeled and do not represent real operations.</p>
    <p className="text-[10px] text-[var(--gray-500)]">Method {HISTORICAL_PATTERN_METHOD.version}. Patterns are calculated dynamically from the currently approved records. Minimum support: {HISTORICAL_PATTERN_METHOD.minimumDistinctRecords} distinct operations. Grouping: exact normalized categories/observations/lesson wording and fixed numeric buckets (altitude {HISTORICAL_PATTERN_METHOD.numericalBuckets.altitudeMeters} m, temperature {HISTORICAL_PATTERN_METHOD.numericalBuckets.temperatureCelsius} °C, duration {HISTORICAL_PATTERN_METHOD.numericalBuckets.durationMinutes} min). Category recurrence does not mean identical lessons; co-occurrence does not show causation or predict outcomes.</p>
    {!inputs ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><input aria-label="Search patterns" placeholder="Search records or lessons" value={query} onChange={(e) => setQuery(e.target.value)} className="rounded border border-[var(--border)] bg-[#090f1b] px-2 py-2 text-[11px] text-[var(--white)]"/><input aria-label="Lesson category" placeholder="Lesson category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border border-[var(--border)] bg-[#090f1b] px-2 py-2 text-[11px] text-[var(--white)]"/><select aria-label="Terrain filter" value={terrain} onChange={(e) => setTerrain(e.target.value)} className="rounded border border-[var(--border)] bg-[#090f1b] px-2 py-2 text-[11px] text-[var(--white)]"><option value="">All terrain</option>{["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"].map((v) => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select><input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-[var(--border)] bg-[#090f1b] px-2 py-2 text-[11px] text-[var(--white)]"/><input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-[var(--border)] bg-[#090f1b] px-2 py-2 text-[11px] text-[var(--white)]"/></div> : <p className="text-[10px] text-[var(--gray-500)]">Scenario terrain: {scenarioTerrain ?? "not specified"}. Terrain matches are shown first; other observations are included as historical context. No mission parameters are changed.</p>}
    {loading ? <p className="text-[12px] text-[var(--gray-500)]">Analyzing approved records…</p> : error ? <p className="text-[12px] text-rose-200">{error}</p> : visible.length === 0 ? <p className="text-[12px] text-[var(--gray-400)]">{recordCount < HISTORICAL_PATTERN_METHOD.minimumDistinctRecords ? "At least two approved historical records are needed to identify recurring patterns." : "No recurring patterns with sufficient evidence match these filters."}</p> : <div className="space-y-3">{visible.slice(0, inputs ? 8 : 40).map((pattern) => {
      const terrainMatch = Boolean(scenarioTerrain && pattern.records.some((r) => r.terrain.replaceAll("_", " ").toLowerCase() === scenarioTerrain));
      return <article key={pattern.id} className="space-y-2 rounded border border-[var(--border)] bg-[#090f1b] p-3"><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={pattern.consistency === "CONFLICTING" ? "muted" : "cyan"}>{pattern.grouping.replaceAll("_", " ")}</StatusBadge><StatusBadge>{pattern.supportCount} RECORDS</StatusBadge>{pattern.consistency === "CONFLICTING" ? <StatusBadge tone="muted">VARIATION IN DOCUMENTATION</StatusBadge> : null}{inputs ? <StatusBadge tone={terrainMatch ? "cyan" : "muted"}>{terrainMatch ? "TERRAIN MATCH" : "TERRAIN NOT MATCHED"}</StatusBadge> : null}<span className="text-[10px] text-[var(--gray-500)]">Coverage {pattern.coveragePercent}%</span></div><h3 className="text-[12px] font-medium text-[var(--white)]">{pattern.description}</h3><p className="text-[10px] text-[var(--gray-500)]">{pattern.dimension} · {pattern.consistency === "CONFLICTING" ? "supporting records include differing documented values" : "same normalized value in supporting records"}. Missing information: {pattern.missingInformation.length ? pattern.missingInformation.join(", ") : "none flagged"}.</p><div className="flex flex-wrap gap-2">{pattern.records.map((record) => <span key={record.id} className="inline-flex flex-wrap items-center gap-1 text-[10px]"><Link className="text-[var(--cyan)] hover:underline" href={`/operations/${record.id}`}>{record.title}</Link><span className="text-[var(--gray-500)]">· {record.date ? new Date(record.date).toLocaleDateString() : "date unavailable"} · {record.region}</span>{record.sourceDocument ? <a className="text-[var(--cyan)] hover:underline" href={`/api/operations/documents/${record.sourceDocument.id}/file`} target="_blank" rel="noreferrer">source: {record.sourceDocument.filename}</a> : <span className="text-[var(--gray-500)]">source file unavailable</span>}</span>)}</div>{pattern.records.flatMap((record) => record.lessons.map((lesson) => ({ ...lesson, recordId: record.id, recordTitle: record.title }))).length ? <details className="border-t border-[var(--border)] pt-2"><summary className="cursor-pointer text-[10px] text-[var(--cyan)]">Supporting approved lesson wording</summary><ul className="mt-2 space-y-2">{pattern.records.flatMap((record) => record.lessons.map((lesson) => ({ ...lesson, recordId: record.id, recordTitle: record.title }))).map((lesson) => <li key={`${lesson.id}-${lesson.recordId}`} className="text-[10px] text-[var(--gray-300)]"><Link href={`/operations/${lesson.recordId}`} className="text-[var(--cyan)] hover:underline">{lesson.title}</Link> · {lesson.description} <span className="text-[var(--gray-500)]">({lesson.category}, {lesson.recordTitle})</span>{lesson.sourcePassage ? <blockquote className="mt-1 border-l border-[var(--gray-500)] pl-2 text-[var(--gray-500)]">Original approved passage: “{lesson.sourcePassage}”</blockquote> : null}</li>)}</ul></details> : null}</article>;
    })}</div>}
  </Panel>;
}
