"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";

type SearchResult = { id: string; title: string; category: string | null; region: string; eventDate: string | null; isDemo: boolean; humanFactors: string; lessons: Array<{ id: string; title: string; description: string; category: string }>; sourceDocument: { id: string; originalFilename: string } | null };
type SearchResponse = { mode: "ai-ranked" | "unavailable"; message: string; results: SearchResult[]; error?: string };

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function search() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/learning/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const data = await response.json() as SearchResponse;
      if (!response.ok) throw new Error(data.error ?? "Knowledge search failed.");
      setResult(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Knowledge search failed."); setResult(null); }
    finally { setBusy(false); }
  }
  return <Panel className="!p-5 space-y-3">
    <SectionHeader title="Search institutional knowledge" subtitle="Search approved records and lessons; source passages remain attached to their records" action={<StatusBadge tone="muted">GROUNDED IN RECORDS</StatusBadge>} />
    <div className="flex flex-col gap-2 sm:flex-row"><input className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[#090f1b] px-3 py-2 text-[12px] text-[var(--white)]" value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search(); }} placeholder="Ask about approved observations, lessons, terrain or fatigue"/><Button size="sm" disabled={busy || query.trim().length < 3} onClick={() => void search()}>{busy ? "Searching…" : "Search"}</Button></div>
    <p className="text-[10px] text-[var(--gray-500)]">Hugging Face may rank keyword-retrieved approved sources when configured. The answer is not generated from unsupported claims; results below show the underlying records. If AI is unavailable, keyword results are labeled as such.</p>
    {error ? <p role="alert" className="text-[11px] text-rose-200">{error}</p> : null}
    {result ? <div className="space-y-2 border-t border-[var(--border)] pt-3"><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={result.mode === "ai-ranked" ? "cyan" : "muted"}>{result.mode === "ai-ranked" ? "AI RANKED" : "KEYWORD SEARCH · AI UNAVAILABLE"}</StatusBadge><span className="text-[10px] text-[var(--gray-400)]">{result.message}</span></div>{result.results.length ? result.results.map((record) => <article key={record.id} className="rounded border border-[var(--border)] p-3"><div className="flex flex-wrap items-center gap-2"><Link href={`/operations/${record.id}`} className="text-[12px] font-medium text-[var(--cyan)] hover:underline">{record.title}</Link>{record.isDemo ? <StatusBadge tone="muted">SYNTHETIC</StatusBadge> : null}<span className="text-[10px] text-[var(--gray-500)]">{record.category ?? "Category not recorded"} · {record.eventDate ? new Date(record.eventDate).toLocaleDateString() : "event date not recorded"} · {record.region}</span></div>{record.humanFactors ? <p className="mt-1 text-[11px] text-[var(--gray-300)]">Observation: {record.humanFactors}</p> : null}{record.lessons.slice(0, 2).map((lesson) => <p key={lesson.id} className="mt-1 text-[11px] text-[var(--gray-400)]">{lesson.title}: {lesson.description}</p>)}<p className="mt-2 text-[10px] text-[var(--gray-500)]">{record.sourceDocument ? `Source: ${record.sourceDocument.originalFilename}` : "No source document linked"}</p></article>) : <p className="text-[11px] text-[var(--gray-500)]">No approved records matched those search terms.</p>}</div> : null}
  </Panel>;
}
