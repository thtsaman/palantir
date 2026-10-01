"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Button } from "@/components/ui/Button";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type RoleOption = {
  id: string;
  name: string;
  code: string;
  squadName: string;
  unitName: string;
};

type ImportResult = {
  imported: number;
  failed: number;
  duplicates: number;
  errors: string[];
  preview?: unknown[];
};

type CsvPreviewRow = Record<string, string>;

const emptyForm = {
  soldierCode: "",
  roleId: "",
  experienceYears: 4,
  baselineMobility: 85,
  baselineEndurance: 82,
  baselineStrength: 80,
  baselineRecovery: 78,
  typicalLoadKg: 18,
  status: "ACTIVE",
};

const inputClass =
  "h-9 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--ink)] px-2.5 text-[13px] text-[var(--off-white)] focus:border-[var(--cyan)]/45 focus:outline-none";

export function SoldiersClient({ roles }: { roles: RoleOption[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<"none" | "add" | "import">("none");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvPreviewRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const roleLabel = useMemo(() => {
    const map = new Map(roles.map((r) => [r.id, r]));
    return (id: string) => {
      const r = map.get(id);
      if (!r) return "—";
      return `${r.name} · ${r.squadName}`;
    };
  }, [roles]);

  async function submitSoldier(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/soldiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soldierCode: form.soldierCode.trim(),
          roleId: form.roleId,
          experienceYears: Number(form.experienceYears),
          baselineMobility: Number(form.baselineMobility),
          baselineEndurance: Number(form.baselineEndurance),
          baselineStrength: Number(form.baselineStrength),
          baselineRecovery: Number(form.baselineRecovery),
          typicalLoadKg: Number(form.typicalLoadKg),
          status: form.status,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Unable to create soldier."
        );
        return;
      }
      setMessage(`Soldier ${form.soldierCode.trim()} created.`);
      setForm({ ...emptyForm, roleId: roles[0]?.id ?? "" });
      setPanel("none");
      router.refresh();
    } catch {
      setError("Network error while creating soldier.");
    } finally {
      setBusy(false);
    }
  }

  function onFileSelected(file: File) {
    setImportResult(null);
    setError(null);
    setMessage(null);
    Papa.parse<CsvPreviewRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length) {
          setError(result.errors[0]?.message ?? "CSV parse error.");
          setPreview([]);
          return;
        }
        setPreview(result.data.slice(0, 40));
        setPanel("import");
      },
      error: (err) => {
        setError(err.message);
        setPreview([]);
      },
    });
  }

  async function runImport() {
    if (!preview.length) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/soldiers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview }),
      });
      const data = (await res.json().catch(() => ({}))) as ImportResult & {
        error?: string;
      };
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Import failed."
        );
        return;
      }
      setImportResult(data);
      setMessage(
        `Imported ${data.imported}. Failed ${data.failed}. Duplicates ${data.duplicates}.`
      );
      router.refresh();
    } catch {
      setError("Network error while importing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            setPanel((p) => (p === "add" ? "none" : "add"));
            setError(null);
            setMessage(null);
            if (!form.roleId && roles[0]) {
              setForm((f) => ({ ...f, roleId: roles[0]!.id }));
            }
          }}
        >
          + Add Soldier
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setError(null);
            setMessage(null);
            fileRef.current?.click();
          }}
        >
          Import CSV
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
            e.target.value = "";
          }}
        />
        <StatusBadge tone="muted">DEMO DATA</StatusBadge>
      </div>

      {message ? (
        <p className="text-[12px] text-[var(--cyan)]">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-[6px] border border-[var(--border-strong)] bg-[var(--gray-800)] px-3 py-2 text-[12px] text-[var(--gray-100)]">
          {error}
        </p>
      ) : null}

      {panel === "add" ? (
        <Panel className="!p-5">
          <SectionHeader
            title="Add Soldier"
            subtitle="Baseline profile for simulation"
            action={<StatusBadge tone="cyan">BASELINE</StatusBadge>}
          />
          <form onSubmit={submitSoldier} className="grid gap-3 md:grid-cols-2">
            <Field label="Soldier ID">
              <input
                required
                value={form.soldierCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, soldierCode: e.target.value }))
                }
                className={cn(inputClass, "mono")}
                placeholder="S-201"
              />
            </Field>
            <Field label="Role">
              <select
                required
                value={form.roleId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, roleId: e.target.value }))
                }
                className={inputClass}
              >
                <option value="" disabled>
                  Select role
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.squadName} / {r.unitName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Experience (years)">
              <input
                type="number"
                min={0}
                max={40}
                required
                value={form.experienceYears}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    experienceYears: Number(e.target.value),
                  }))
                }
                className={cn(inputClass, "mono tabular")}
              />
            </Field>
            <Field label="Typical load (kg)">
              <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                required
                value={form.typicalLoadKg}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    typicalLoadKg: Number(e.target.value),
                  }))
                }
                className={cn(inputClass, "mono tabular")}
              />
            </Field>
            {(
              [
                ["baselineMobility", "Mobility"],
                ["baselineEndurance", "Endurance"],
                ["baselineStrength", "Strength"],
                ["baselineRecovery", "Recovery"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={`Baseline ${label}`}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: Number(e.target.value) }))
                  }
                  className={cn(inputClass, "mono tabular")}
                />
              </Field>
            ))}
            <div className="flex items-center gap-2 pt-1 md:col-span-2">
              <Button type="submit" size="sm" disabled={busy || !roles.length}>
                {busy ? "Saving…" : "Create Soldier"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPanel("none")}
              >
                Cancel
              </Button>
              {form.roleId ? (
                <span className="text-[11px] text-[var(--gray-500)]">
                  {roleLabel(form.roleId)}
                </span>
              ) : null}
            </div>
          </form>
        </Panel>
      ) : null}

      {panel === "import" ? (
        <Panel className="!p-5">
          <SectionHeader
            title="Import CSV"
            subtitle="Columns: soldierCode, role, experienceYears, baselineMobility, baselineEndurance, baselineStrength, baselineRecovery, typicalLoadKg"
            action={<StatusBadge>HISTORICAL</StatusBadge>}
          />
          {preview.length === 0 ? (
            <p className="text-[13px] text-[var(--gray-300)]">
              Choose a CSV file to preview rows before import.
            </p>
          ) : (
            <>
              <div className="mb-3 overflow-x-auto rounded-[6px] border border-[var(--border)]">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead className="bg-[var(--gray-800)] text-[var(--gray-500)]">
                    <tr>
                      {Object.keys(preview[0] ?? {}).map((k) => (
                        <th
                          key={k}
                          className="px-2.5 py-2 text-[10px] font-medium uppercase tracking-wide"
                        >
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 12).map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-[var(--border)] hover:bg-[var(--cyan-dim)]/40"
                      >
                        {Object.keys(preview[0] ?? {}).map((k) => (
                          <td
                            key={k}
                            className={cn(
                              "px-2.5 py-1.5 text-[var(--off-white)]",
                              /year|mob|end|str|rec|load|kg/i.test(k) &&
                                "mono tabular text-[var(--cyan)]"
                            )}
                          >
                            {row[k] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={runImport} disabled={busy}>
                  {busy ? "Importing…" : `Import ${preview.length} rows`}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPreview([]);
                    setImportResult(null);
                    setPanel("none");
                  }}
                >
                  Close
                </Button>
              </div>
              {importResult ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ResultStat label="Imported" value={importResult.imported} />
                  <ResultStat label="Failed" value={importResult.failed} />
                  <ResultStat
                    label="Duplicates"
                    value={importResult.duplicates}
                  />
                  {importResult.errors?.length ? (
                    <ul className="space-y-1 text-[11px] text-[var(--gray-300)] sm:col-span-3">
                      {importResult.errors.slice(0, 8).map((err, i) => (
                        <li key={i} className="mono">
                          {err}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </Panel>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="label-xs">{label}</span>
      {children}
    </label>
  );
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] px-3 py-2">
      <div className="label-xs mb-1">{label}</div>
      <div className="mono tabular text-[22px] leading-none text-[var(--cyan)]">
        {value}
      </div>
    </div>
  );
}
