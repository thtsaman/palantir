"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Panel, SectionHeader, StatusBadge } from "@/components/ui/primitives";

type Role = { id: string; name: string; code: string };
type Squad = { id: string; name: string; code: string; platoonId: string | null; roles: Role[] };
type Unit = { id: string; name: string; code: string; squads: Squad[]; companies: Array<{ id: string; name: string; code: string; platoons: Array<{ id: string; name: string; code: string; squads: Squad[] }> }> };

export function OrganizationManager({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const companies = useMemo(() => units.flatMap((unit) => unit.companies.map((company) => ({ ...company, unitName: unit.name, unitId: unit.id }))), [units]);
  const platoons = useMemo(() => companies.flatMap((company) => company.platoons.map((platoon) => ({ ...platoon, companyName: company.name, unitId: company.unitId }))), [companies]);
  const squads = useMemo(() => units.flatMap((unit) => [...unit.squads, ...unit.companies.flatMap((company) => company.platoons.flatMap((platoon) => platoon.squads))].map((squad) => ({ ...squad, unitId: unit.id, unitName: unit.name }))), [units]);

  async function create(event: React.FormEvent<HTMLFormElement>, kind: "company" | "platoon" | "squad" | "role") {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fields = Object.fromEntries(formData.entries()) as Record<string, string>;
    const body = kind === "squad" ? { ...fields, platoonId: fields.platoonId || null } : fields;
    try {
      const response = await fetch("/api/units/tree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...body }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not create organization record.");
      form.reset(); setMessage(`${kind[0]!.toUpperCase()}${kind.slice(1)} created.`); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create organization record."); }
    finally { setBusy(false); }
  }

  async function assign(squadId: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/units/tree", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ squadId, platoonId: assignments[squadId] || null }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update squad assignment.");
      setMessage("Squad assignment saved."); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update squad assignment."); }
    finally { setBusy(false); }
  }

  const field = "min-w-0 rounded border border-[var(--border-strong)] bg-[var(--ink)] px-2.5 py-2 text-[12px] text-[var(--off-white)]";
  const select = `${field} w-full`;
  return <div className="space-y-4">
    <Panel className="!p-5 space-y-3"><SectionHeader title="Saved hierarchy" subtitle="A squad can be assigned to one platoon in its unit or remain directly under the unit." action={<StatusBadge tone="cyan">{units.length} UNITS · {companies.length} COMPANIES · {platoons.length} PLATOONS · {squads.length} SQUADS</StatusBadge>} />
      {units.map((unit) => <div key={unit.id} className="space-y-2 border-t border-[var(--border)] pt-3"><div className="text-[13px] font-semibold text-[var(--white)]">{unit.name} <span className="mono text-[10px] text-[var(--gray-500)]">{unit.code}</span></div>{unit.companies.map((company) => <div key={company.id} className="ml-3 border-l border-[var(--border)] pl-3"><div className="text-[12px] text-[var(--cyan)]">Company · {company.name} <span className="mono text-[10px] text-[var(--gray-500)]">{company.code}</span></div>{company.platoons.map((platoon) => <div key={platoon.id} className="ml-3 mt-1 border-l border-[var(--border)] pl-3"><div className="text-[11px] text-[var(--gray-300)]">Platoon · {platoon.name} <span className="mono text-[10px] text-[var(--gray-500)]">{platoon.code}</span></div><div className="mt-1 text-[10px] text-[var(--gray-500)]">{platoon.squads.map((squad) => `${squad.name} (${squad.roles.length} roles)`).join(" · ") || "No squads assigned"}</div></div>)}</div>)}{unit.squads.length ? <div className="ml-3 text-[11px] text-[var(--gray-400)]">Direct squads: {unit.squads.map((squad) => squad.name).join(", ")}</div> : null}</div>)}
    </Panel>
    <div className="grid gap-4 lg:grid-cols-2">
      <CreatePanel title="Create Company" kind="company" onSubmit={create} busy={busy} field={field} select={select} units={units} companies={companies} squads={squads} />
      <CreatePanel title="Create Platoon" kind="platoon" onSubmit={create} busy={busy} field={field} select={select} units={units} companies={companies} squads={squads} />
      <CreatePanel title="Create Squad" kind="squad" onSubmit={create} busy={busy} field={field} select={select} units={units} companies={companies} squads={squads} />
      <CreatePanel title="Create Role" kind="role" onSubmit={create} busy={busy} field={field} select={select} units={units} companies={companies} squads={squads} />
    </div>
    <Panel className="!p-5 space-y-3"><SectionHeader title="Assign squads to platoons" subtitle="Moving a squad changes its organization link, not any saved simulation snapshot." />{squads.length ? <div className="space-y-2">{squads.map((squad) => <div key={squad.id} className="flex flex-wrap items-center gap-2"><span className="min-w-[150px] flex-1 text-[12px] text-[var(--gray-300)]">{squad.unitName} / {squad.name}</span><select className={`${select} max-w-[260px]`} value={assignments[squad.id] ?? squad.platoonId ?? ""} onChange={(event) => setAssignments((old) => ({ ...old, [squad.id]: event.target.value }))}><option value="">Direct under unit</option>{platoons.filter((platoon) => platoon.unitId === squad.unitId).map((platoon) => <option key={platoon.id} value={platoon.id}>{platoon.companyName} / {platoon.name}</option>)}</select><Button size="sm" variant="secondary" disabled={busy} onClick={() => void assign(squad.id)}>Save</Button></div>)}</div> : <p className="text-[12px] text-[var(--gray-500)]">Create a squad first.</p>}</Panel>
    {error ? <p role="alert" className="text-[12px] text-rose-200">{error}</p> : null}{message ? <p role="status" className="text-[12px] text-[var(--cyan)]">{message}</p> : null}
  </div>;
}

function CreatePanel({ title, kind, onSubmit, busy, field, select, units, companies, squads }: { title: string; kind: "company" | "platoon" | "squad" | "role"; onSubmit: (event: React.FormEvent<HTMLFormElement>, kind: "company" | "platoon" | "squad" | "role") => void; busy: boolean; field: string; select: string; units: Unit[]; companies: Array<{ id: string; name: string; unitId: string }>; squads: Squad[] }) {
  const unitsForCompany = companies;
  return <Panel className="!p-4 space-y-3"><SectionHeader title={title} /><form className="grid gap-2 sm:grid-cols-2" onSubmit={(event) => onSubmit(event, kind)}><input className={field} name="name" required maxLength={80} placeholder={`${title.replace("Create ", "")} name`} /><input className={field} name="code" required minLength={2} maxLength={48} pattern="[A-Za-z0-9_-]+" placeholder="Unique code" />{kind === "company" ? <select className={select} name="unitId" required defaultValue=""><option value="" disabled>Select unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select> : null}{kind === "platoon" ? <select className={select} name="companyId" required defaultValue=""><option value="" disabled>Select company</option>{unitsForCompany.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select> : null}{kind === "squad" ? <><select className={select} name="unitId" required defaultValue=""><option value="" disabled>Select unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><select className={select} name="platoonId" defaultValue=""><option value="">Direct under unit</option>{units.flatMap((unit) => unit.companies.flatMap((company) => company.platoons.map((platoon) => ({ ...platoon, companyName: company.name, unitName: unit.name })))).map((platoon) => <option key={platoon.id} value={platoon.id}>{platoon.unitName} / {platoon.companyName} / {platoon.name}</option>)}</select></> : null}{kind === "role" ? <select className={select} name="squadId" required defaultValue=""><option value="" disabled>Select squad</option>{squads.map((squad) => <option key={squad.id} value={squad.id}>{squad.name}</option>)}</select> : null}<Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Create"}</Button></form></Panel>;
}
