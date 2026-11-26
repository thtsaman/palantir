"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Panel, SectionHeader } from "@/components/ui/primitives";

type SoldierEdit = {
  id: string;
  displayName: string | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  fitnessAssessment: string | null;
  assessmentDate: string | null;
  assessmentSource: string | null;
  profileSource: string | null;
  profileAssessedAt: string | null;
};

export function EditSoldierForm({ soldier }: { soldier: SoldierEdit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    displayName: soldier.displayName ?? "",
    ageYears: soldier.ageYears?.toString() ?? "",
    heightCm: soldier.heightCm?.toString() ?? "",
    weightKg: soldier.weightKg?.toString() ?? "",
    fitnessAssessment: soldier.fitnessAssessment ?? "",
    assessmentDate: soldier.assessmentDate?.slice(0, 10) ?? "",
    assessmentSource: soldier.assessmentSource ?? "",
    profileSource: soldier.profileSource ?? "",
    profileAssessedAt: soldier.profileAssessedAt?.slice(0, 10) ?? "",
  });

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/soldiers/${soldier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ageYears: form.ageYears === "" ? null : Number(form.ageYears),
          heightCm: form.heightCm === "" ? null : Number(form.heightCm),
          weightKg: form.weightKg === "" ? null : Number(form.weightKg),
          displayName: form.displayName.trim() || null,
          fitnessAssessment: form.fitnessAssessment.trim() || null,
          assessmentDate: form.assessmentDate || null,
          assessmentSource: form.assessmentSource.trim() || null,
          profileSource: form.profileSource.trim() || null,
          profileAssessedAt: form.profileAssessedAt || null,
          profileProvenance: "USER_ENTERED",
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to save profile");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save profile");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>{open ? "Close profile editor" : "Edit profile"}</Button>
    {open ? <Panel className="mt-4 !p-5">
      <SectionHeader title="Edit profile" subtitle="Leave unavailable measurements blank; values remain nullable" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="Display name" value={form.displayName} onChange={(v) => setForm((f) => ({ ...f, displayName: v }))} />
        <TextField label="Age (18–75)" type="number" value={form.ageYears} onChange={(v) => setForm((f) => ({ ...f, ageYears: v }))} />
        <TextField label="Height cm (120–230)" type="number" value={form.heightCm} onChange={(v) => setForm((f) => ({ ...f, heightCm: v }))} />
        <TextField label="Weight kg (35–250)" type="number" value={form.weightKg} onChange={(v) => setForm((f) => ({ ...f, weightKg: v }))} />
        <TextField label="Fitness assessment date" type="date" value={form.assessmentDate} onChange={(v) => setForm((f) => ({ ...f, assessmentDate: v }))} />
        <TextField label="Fitness assessment source" value={form.assessmentSource} onChange={(v) => setForm((f) => ({ ...f, assessmentSource: v }))} />
        <TextField label="Profile source" value={form.profileSource} onChange={(v) => setForm((f) => ({ ...f, profileSource: v }))} />
        <TextField label="Profile assessed date" type="date" value={form.profileAssessedAt} onChange={(v) => setForm((f) => ({ ...f, profileAssessedAt: v }))} />
        <label className="block space-y-1.5 sm:col-span-2 lg:col-span-3"><span className="label-xs">Fitness assessment information</span><textarea maxLength={1000} rows={3} value={form.fitnessAssessment} onChange={(e) => setForm((f) => ({ ...f, fitnessAssessment: e.target.value }))} className="w-full rounded border border-[var(--border-strong)] bg-[var(--ink)] px-3 py-2 text-[13px] text-[var(--off-white)]" /></label>
      </div>
      {error ? <p className="mt-3 text-[12px] text-[var(--gray-300)]">{error}</p> : null}
      <div className="mt-4 flex gap-2"><Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </Panel> : null}
  </>;
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const bounds = label.startsWith("Age") ? { min: 18, max: 75 } : label.startsWith("Height") ? { min: 120, max: 230 } : label.startsWith("Weight") ? { min: 35, max: 250 } : {};
  return <label className="block space-y-1.5"><span className="label-xs">{label}</span><input type={type} {...bounds} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded border border-[var(--border-strong)] bg-[var(--ink)] px-2.5 text-[13px] text-[var(--off-white)]" /></label>;
}
