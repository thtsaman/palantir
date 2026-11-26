"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const control = "w-full rounded border border-[var(--border)] bg-[#090f1b] px-2 py-1.5 text-[11px] text-[var(--white)]";

export function LessonLifecycleControl({ lesson }: { lesson: { id: string; reviewStatus: string; lifecycle: "OBSERVATION" | "IDENTIFIED" | "ACTION_ASSIGNED" | "VALIDATED"; actionOwner: string | null; actionDueDate: string | null; validationNotes: string | null } }) {
  const [lifecycle, setLifecycle] = useState(lesson.lifecycle);
  const [actionOwner, setActionOwner] = useState(lesson.actionOwner ?? "");
  const [actionDueDate, setActionDueDate] = useState(lesson.actionDueDate ?? "");
  const [validationNotes, setValidationNotes] = useState(lesson.validationNotes ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/operations/lessons/${lesson.id}/lifecycle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lifecycle, actionOwner, actionDueDate: actionDueDate || null, validationNotes }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Lifecycle update failed.");
      setMessage("Lesson lifecycle saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Lifecycle update failed."); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 rounded border border-[var(--border)] bg-[#090f1b] p-3">
    <div className="grid gap-2 sm:grid-cols-2"><label className="space-y-1 text-[9px] uppercase tracking-wide text-[var(--gray-500)]">Learning stage<select className={control} value={lifecycle} disabled={lesson.reviewStatus !== "APPROVED"} onChange={(event) => setLifecycle(event.target.value as typeof lifecycle)}><option value="OBSERVATION">Observation</option><option value="IDENTIFIED">Lesson identified</option><option value="ACTION_ASSIGNED">Action assigned</option><option value="VALIDATED">Validated</option></select></label>{lifecycle === "ACTION_ASSIGNED" ? <><label className="space-y-1 text-[9px] uppercase tracking-wide text-[var(--gray-500)]">Action owner<input className={control} maxLength={160} value={actionOwner} onChange={(event) => setActionOwner(event.target.value)} /></label><label className="space-y-1 text-[9px] uppercase tracking-wide text-[var(--gray-500)]">Due date<input className={control} type="date" value={actionDueDate} onChange={(event) => setActionDueDate(event.target.value)} /></label></> : null}{lifecycle === "VALIDATED" ? <label className="space-y-1 text-[9px] uppercase tracking-wide text-[var(--gray-500)] sm:col-span-2">Validation evidence / notes<textarea className={control} maxLength={2000} rows={2} value={validationNotes} onChange={(event) => setValidationNotes(event.target.value)} /></label> : null}</div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] text-[var(--gray-500)]">Stages track learning follow-up only; validation notes are not proof of operational effectiveness.</p><Button size="sm" variant="secondary" disabled={busy || lesson.reviewStatus !== "APPROVED"} onClick={() => void save()}>{busy ? "Saving…" : "Save stage"}</Button></div>{error ? <p role="alert" className="mt-1 text-[10px] text-rose-200">{error}</p> : null}{message ? <p className="mt-1 text-[10px] text-[var(--cyan)]">{message}</p> : null}
  </div>;
}
