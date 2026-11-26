"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";

type SourceItem = { id: string; originalFilename: string; fileType: string | null; fileSizeBytes: number; uploadedAt: string; status: string; extractionError: string | null };

export function DocumentSourceQueue({ initialItems }: { initialItems: SourceItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  async function discard(id: string) {
    setError(null);
    const response = await fetch(`/api/operations/documents/${id}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error ?? "Could not discard source document."); return; }
    setItems((current) => current.filter((item) => item.id !== id));
  }
  if (!items.length) return null;
  return <Panel className="mt-5 !p-5 space-y-3"><SectionHeader title="Unconfirmed source documents" subtitle="Preview records remain separate until you confirm an operation." />
    {items.map((item) => <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-[var(--border)] pt-3 text-[12px]"><div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={item.status === "FAILED" ? "muted" : "cyan"}>{item.status}</StatusBadge><span className="text-[var(--off-white)]">{item.originalFilename}</span><span className="text-[var(--gray-500)]">{item.fileType ?? "unsupported"} · {(item.fileSizeBytes / 1024).toFixed(1)} KB · {new Date(item.uploadedAt).toLocaleString()}</span></div>{item.extractionError ? <p className="text-[11px] text-rose-200">{item.extractionError}</p> : <p className="text-[11px] text-[var(--gray-500)]">Private source and extracted text are saved; reopen the preview to continue reviewing.</p>}</div><div className="flex gap-2">{item.status === "PREVIEW_READY" ? <Button href={`/operations/new?sourceDocumentId=${item.id}`} variant="secondary" size="sm">Review preview</Button> : null}<Button onClick={() => void discard(item.id)} variant="ghost" size="sm">Discard</Button></div></div>)}
    {error ? <p role="alert" className="text-[12px] text-rose-200">{error}</p> : null}
  </Panel>;
}
