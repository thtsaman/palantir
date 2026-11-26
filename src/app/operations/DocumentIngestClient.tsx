"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";

type PreviewSource = { id: string; originalFilename: string; fileType: "PDF" | "DOCX" | "TXT" | null; fileSizeBytes: number; uploadedAt: string; status: "PREVIEW_READY" | "FAILED"; extractionError?: string | null };
type Operation = { id: string; title: string };
type PreviewResponse = { source?: PreviewSource | null; extractedText?: string; error?: string };
const inputClass = "h-9 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--ink)] px-2.5 text-[13px] text-[var(--off-white)] focus:border-[var(--cyan)]/45 focus:outline-none";
const textFields = [
  ["region", "Region"], ["altitudeBand", "Altitude band"], ["temperatureBand", "Temperature band"],
  ["weatherSummary", "Weather summary"], ["personnelSummary", "Personnel summary"],
  ["environmentalFactors", "Environmental factors"], ["humanFactors", "Human factors"],
] as const;

export function DocumentIngestClient({ initialSourceId = null }: { initialSourceId?: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<PreviewSource | null>(null);
  const [failedSource, setFailedSource] = useState<PreviewSource | null>(null);
  const [text, setText] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({ title: "", region: "", terrainType: "", altitudeBand: "", temperatureBand: "", durationMinutes: "", timeOfDay: "", weatherSummary: "", personnelSummary: "", environmentalFactors: "", humanFactors: "" });
  const [savedOperation, setSavedOperation] = useState<Operation | null>(null);

  useEffect(() => {
    if (!initialSourceId) return;
    let active = true;
    fetch(`/api/operations/documents/${initialSourceId}`).then(async (response) => {
      const result = await response.json() as PreviewResponse;
      if (!response.ok || !result.source) throw new Error(result.error ?? "Could not reopen document preview.");
      if (!active) return;
      if (result.source.status === "FAILED") { setFailedSource(result.source); setError(result.source.extractionError ?? "Document extraction failed."); return; }
      if (!result.extractedText) throw new Error("This preview has no extracted text and cannot be confirmed.");
      setSource(result.source); setText(result.extractedText);
      setFields((current) => ({ ...current, title: result.source!.originalFilename.replace(/\.[^.]+$/, "") }));
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not reopen document preview."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [initialSourceId]);

  async function preview() {
    if (!file) return;
    setBusy(true); setError(null); setSource(null); setFailedSource(null); setSavedOperation(null);
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/operations/documents/preview", { method: "POST", body: form });
      const result = await response.json() as PreviewResponse;
      if (!response.ok || !result.source || !result.extractedText) { setFailedSource(result.source ?? null); throw new Error(result.error ?? "Document extraction failed."); }
      setSource(result.source); setText(result.extractedText);
      const stem = result.source.originalFilename.replace(/\.[^.]+$/, "");
      setFields((current) => ({ ...current, title: stem }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read the document."); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!source) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/operations/documents/${source.id}/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, durationMinutes: Number(fields.durationMinutes), reviewedText: text }),
      });
      const result = await response.json() as { operation?: Operation; error?: string };
      if (!response.ok || !result.operation) throw new Error(result.error ?? "Could not save the operation.");
      setSavedOperation(result.operation);
      router.push(`/operations/${result.operation.id}`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the operation."); }
    finally { setBusy(false); }
  }

  async function discardPreview() {
    const target = source ?? failedSource;
    if (!target) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/operations/documents/${target.id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not discard this preview.");
      setSource(null); setFailedSource(null); setText("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not discard this preview."); }
    finally { setBusy(false); }
  }

  function update(key: string, value: string) { setFields((current) => ({ ...current, [key]: value })); }
  const restoringPreview = Boolean(initialSourceId && !source && !failedSource && !error);
  const canPreview = Boolean(file) && !busy && !restoringPreview;
  const requiredFieldsComplete = ["title", "region", "terrainType", "altitudeBand", "temperatureBand", "durationMinutes", "timeOfDay", "weatherSummary", "personnelSummary", "environmentalFactors", "humanFactors"].every((key) => fields[key]?.trim());

  return <Panel className="!p-5 space-y-5">
    <SectionHeader title="Upload a source document" subtitle="Extract and review report text before creating a draft operation" action={<StatusBadge tone="muted">NO AI EXTRACTION</StatusBadge>} />
    <p className="text-[12px] text-[var(--gray-400)]">Supported: PDF with selectable text, DOCX, UTF-8 TXT · maximum 15 MB · scanned PDFs are unsupported because OCR is not enabled. Upload only synthetic or non-sensitive documents during development.</p>
    <div className="flex flex-wrap items-center gap-3">
      <input type="file" disabled={busy || restoringPreview || Boolean(source) || Boolean(failedSource)} accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setSource(null); setFailedSource(null); setSavedOperation(null); setError(null); }} className="block max-w-full text-[12px] text-[var(--gray-300)] file:mr-3 file:rounded file:border file:border-[var(--border-strong)] file:bg-[#101a2a] file:px-3 file:py-2 file:text-[12px] file:text-[var(--cyan)]" />
      <Button onClick={preview} disabled={!canPreview}>{(busy || restoringPreview) && !source ? "Validating and extracting…" : "Upload & Preview"}</Button>
      {file ? <span className="text-[11px] text-[var(--gray-500)]">{file.name} · {(file.size / 1024).toFixed(0)} KB</span> : null}
    </div>
    {error ? <p role="alert" className="rounded border border-rose-900/70 bg-rose-950/20 p-3 text-[12px] text-rose-200">{error}</p> : null}
    {failedSource ? <div className="flex flex-wrap items-center gap-3 rounded border border-rose-900/50 p-3 text-[11px] text-[var(--gray-300)]"><StatusBadge tone="muted">EXTRACTION FAILED</StatusBadge><span>{failedSource.originalFilename} · {failedSource.fileType ?? "unsupported type"} · {failedSource.fileSizeBytes} bytes</span><span>{failedSource.extractionError ?? error}</span><Button onClick={discardPreview} variant="ghost" size="sm">Discard failed upload record</Button></div> : null}
    {source ? <div className="space-y-5 border-t border-[var(--border)] pt-5">
      <div className="flex flex-wrap items-center gap-3"><StatusBadge tone="cyan">EXTRACTION PREVIEW READY</StatusBadge><span className="text-[12px] text-[var(--gray-300)]">{source.originalFilename} · {source.fileType} · {(source.fileSizeBytes / 1024).toFixed(1)} KB</span><span className="text-[11px] text-[var(--gray-500)]">Preview ID {source.id}</span></div>
      <label className="block space-y-1.5"><span className="label-xs">Extracted text · review or correct before confirming</span><textarea value={text} onChange={(event) => setText(event.target.value)} rows={12} className="w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--ink)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--off-white)] focus:border-[var(--cyan)]/45 focus:outline-none" /></label>
      <div className="space-y-3"><SectionHeader title="Historical record fields" subtitle="Review and complete these values; no lessons are generated or approved." />
        <label className="block space-y-1.5"><span className="label-xs">Title</span><input value={fields.title} onChange={(event) => update("title", event.target.value)} className={inputClass} /></label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {textFields.map(([key, label]) => <label key={key} className="block space-y-1.5"><span className="label-xs">{label}</span>{["weatherSummary", "personnelSummary", "environmentalFactors", "humanFactors"].includes(key) ? <textarea value={fields[key]} onChange={(event) => update(key, event.target.value)} rows={3} placeholder="Enter reviewed value, or ‘Not stated in report’." className="w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--ink)] px-2.5 py-2 text-[12px] text-[var(--off-white)] focus:border-[var(--cyan)]/45 focus:outline-none" /> : <input value={fields[key]} onChange={(event) => update(key, event.target.value)} className={inputClass} placeholder="Enter reviewed value" />}</label>)}
          <label className="block space-y-1.5"><span className="label-xs">Terrain</span><select value={fields.terrainType} onChange={(event) => update("terrainType", event.target.value)} className={inputClass}><option value="">Select terrain</option>{["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label className="block space-y-1.5"><span className="label-xs">Duration (minutes)</span><input type="number" min={1} max={43200} value={fields.durationMinutes} onChange={(event) => update("durationMinutes", event.target.value)} className={inputClass} /></label>
          <label className="block space-y-1.5"><span className="label-xs">Time of day</span><select value={fields.timeOfDay} onChange={(event) => update("timeOfDay", event.target.value)} className={inputClass}><option value="">Select time of day</option><option value="DAY">Day</option><option value="NIGHT">Night</option></select></label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4"><Button onClick={confirm} disabled={busy || !requiredFieldsComplete || text.trim().length < 20}>{busy ? "Saving draft…" : "Confirm & Save as Draft"}</Button><Button onClick={discardPreview} disabled={busy} variant="ghost" size="sm">Discard preview</Button><span className="text-[11px] text-[var(--gray-500)]">Creates an unreviewed DRAFT operation with no lessons. Source file and extracted text remain linked.</span></div>
    </div> : null}
    {savedOperation ? <p className="text-[12px] text-[var(--cyan)]">Saved {savedOperation.title}.</p> : null}
  </Panel>;
}
