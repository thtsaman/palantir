"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";

type FieldValues = { title: string; operationDate: string; missionCategory: string; adversaryContext: string; region: string; terrainType: string; altitudeBand: string; temperatureBand: string; durationMinutes: number; timeOfDay: string; weatherSummary: string; personnelSummary: string; environmentalFactors: string; humanFactors: string; reviewNotes: string };
type Lesson = { id: string; title: string; description: string; category: string; reviewStatus: "PENDING" | "APPROVED" | "REJECTED"; sourcePassage: string | null; extractionMode: string; confidence: number | null; editedDuringReview: boolean };

export function ReviewPanel({ operationId, initialFields, lessons, extractionJson, sourceId, sourceFilename }: { operationId: string; initialFields: FieldValues; lessons: Lesson[]; extractionJson: unknown; sourceId: string | null; sourceFilename: string | null }) {
  const router = useRouter();
  const [fields, setFields] = useState(initialFields);
  const [items, setItems] = useState(lessons);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [extracting, setExtracting] = useState(false);
  async function extract() {
    if (!sourceId) return;
    setExtracting(true); setError("");
    try { const response = await fetch(`/api/operations/documents/${sourceId}/extract`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Extraction failed"); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Extraction failed"); }
    finally { setExtracting(false); }
  }
  async function decide(decision: "APPROVE" | "REJECT") {
    setBusy(true); setError(""); setMessage("");
    try { const response = await fetch(`/api/operations/${operationId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, fields: { ...fields, operationDate: fields.operationDate || null, missionCategory: fields.missionCategory.trim() || null, adversaryContext: fields.adversaryContext.trim() || null }, lessons: items }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Review save failed"); setMessage(decision === "APPROVE" ? "Approved and published to the learning library." : "Record rejected and retained for administrative review."); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Review failed"); }
    finally { setBusy(false); }
  }
  const update = (key: keyof FieldValues, value: string | number) => setFields((current) => ({ ...current, [key]: value }));
  return <Panel className="!p-5 space-y-4">
    <SectionHeader title="Human review" subtitle="AI output and fallback extraction are interpretations; confirm or edit before approval." action={<StatusBadge tone="cyan">{items.length} LESSONS</StatusBadge>} />
    {sourceId ? <div className="flex flex-wrap items-center gap-2 text-[12px]"><a className="text-[var(--cyan)] hover:underline" href={`/api/operations/documents/${sourceId}/file`} target="_blank" rel="noreferrer">Open original: {sourceFilename}</a><Button onClick={() => void extract()} disabled={extracting} variant="secondary" size="sm">{extracting ? "Extracting…" : items.length ? "Re-run extraction" : "Extract historical information"}</Button></div> : <p className="text-[12px] text-[var(--gray-500)]">Legacy pasted record. No source file is linked.</p>}
    {extractionJson ? <details className="rounded border border-[var(--border)] p-3"><summary className="cursor-pointer text-[12px] text-[var(--cyan)]">Structured extraction · provenance and observations</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] text-[var(--gray-300)]">{JSON.stringify(extractionJson, null, 2)}</pre></details> : null}
    <div className="grid gap-3 sm:grid-cols-2">{field("Title", "title", fields, update)}{field("Event date", "operationDate", fields, update, "date")}{field("Mission category", "missionCategory", fields, update)}{field("Location", "region", fields, update)}{selectField("Terrain", "terrainType", ["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"], fields, update)}{field("Altitude (source wording)", "altitudeBand", fields, update)}{field("Temperature (source wording)", "temperatureBand", fields, update)}{field("Duration (minutes)", "durationMinutes", fields, update, "number")}{selectField("Time of day", "timeOfDay", ["DAY", "NIGHT"], fields, update)}{field("Weather / conditions", "weatherSummary", fields, update)}{field("Personnel", "personnelSummary", fields, update)}{field("Environmental challenges", "environmentalFactors", fields, update)}{field("Human performance / fatigue", "humanFactors", fields, update)}{<label key="adversaryContext" className="space-y-1 text-[10px] uppercase tracking-wide text-[var(--gray-500)]">Descriptive opposition context only · excluded from simulation<textarea className={control} maxLength={2000} value={fields.adversaryContext} onChange={(e) => update("adversaryContext", e.target.value)} /></label>}{field("Review notes", "reviewNotes", fields, update)}</div>
    <div className="space-y-3"><SectionHeader title="Lesson review" subtitle="Only approved lessons are published; source passage is kept separately from the edited interpretation." />{items.length ? items.map((lesson, index) => <div key={lesson.id} className="space-y-2 rounded border border-[var(--border)] p-3"><div className="text-[10px] text-[var(--gray-500)]">{lesson.extractionMode} extraction {lesson.confidence === null ? "· confidence unknown" : `· ${Math.round(lesson.confidence * 100)}% confidence`} · {lesson.editedDuringReview ? "edited in review" : "not edited"}</div><input className={control} aria-label="Lesson title" value={lesson.title} onChange={(e) => setLesson(index, { title: e.target.value })} /><textarea className={control} aria-label="Lesson interpretation" value={lesson.description} onChange={(e) => setLesson(index, { description: e.target.value })} /><input className={control} aria-label="Lesson category" value={lesson.category} onChange={(e) => setLesson(index, { category: e.target.value })} />{lesson.sourcePassage ? <blockquote className="border-l-2 border-[var(--cyan)]/40 pl-3 text-[11px] text-[var(--gray-500)]">Source passage (verbatim): “{lesson.sourcePassage}”</blockquote> : <p className="text-[11px] text-[var(--gray-500)]">No source passage recorded.</p>}<select className={control} aria-label="Lesson approval" value={lesson.reviewStatus} onChange={(e) => setLesson(index, { reviewStatus: e.target.value as Lesson["reviewStatus"] })}><option value="PENDING">Pending review</option><option value="APPROVED">Approve lesson</option><option value="REJECTED">Reject lesson</option></select></div>) : <p className="text-[12px] text-[var(--gray-500)]">No extracted lessons. Add documented lessons by reviewing the source report through the existing ingestion workflow.</p>}</div>
    {error ? <p className="text-[12px] text-rose-200">{error}</p> : null}{message ? <p className="text-[12px] text-[var(--cyan)]">{message}</p> : null}
    <div className="flex flex-wrap justify-end gap-2"><Button onClick={() => void decide("REJECT")} disabled={busy} variant="ghost" size="sm">Reject record</Button><Button onClick={() => void decide("APPROVE")} disabled={busy} size="sm">{busy ? "Saving…" : "Approve record and lessons"}</Button></div>
  </Panel>;
  function setLesson(index: number, changes: Partial<Lesson>) { setItems((current) => current.map((item, i) => i === index ? { ...item, ...changes, editedDuringReview: true } : item)); }
}

const control = "w-full rounded border border-[var(--border)] bg-[var(--ink)] px-3 py-2 text-[12px] text-[var(--off-white)]";
function field(label: string, key: keyof FieldValues, values: FieldValues, update: (key: keyof FieldValues, value: string | number) => void, type = "text") { return <label className="space-y-1 text-[10px] uppercase tracking-wide text-[var(--gray-500)]">{label}<input type={type} className={control} value={values[key]} onChange={(e) => update(key, type === "number" ? Number(e.target.value) : e.target.value)} /></label>; }
function selectField(label: string, key: "terrainType" | "timeOfDay", options: string[], values: FieldValues, update: (key: keyof FieldValues, value: string | number) => void) { return <label className="space-y-1 text-[10px] uppercase tracking-wide text-[var(--gray-500)]">{label}<select className={control} value={values[key]} onChange={(e) => update(key, e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
