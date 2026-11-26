import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { SoldiersClient } from "./SoldiersClient";

export const dynamic = "force-dynamic";

export default async function SoldiersPage() {
  const [soldiers, roles] = await Promise.all([
    prisma.soldier.findMany({
      orderBy: { soldierCode: "asc" },
      include: {
        role: {
          include: {
            squad: { include: { unit: true } },
          },
        },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        squad: { include: { unit: true } },
      },
    }),
  ]);

  const roleOptions = roles.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    squadName: r.squad.name,
    unitName: r.squad.unit.name,
  }));

  return (
    <AppShell title="Soldiers · Soldier Library" meta={<StatusBadge tone="muted">SYNTHETIC DATA MAY BE PRESENT</StatusBadge>}>
      <PageHeader
        eyebrow="Soldier Profiles"
        title="Soldier Library"
        description="Baseline human-performance profiles used as inputs for mission simulation."
      />

      <div className="mb-4">
        <SoldiersClient roles={roleOptions} />
      </div>

      {soldiers.length === 0 ? (
        <EmptyState
          title="No soldiers yet"
          description="Add a baseline profile or import a CSV to populate the soldier library."
        />
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <StatusBadge tone="cyan">BASELINE</StatusBadge>
              <span className="text-[12px] text-[var(--gray-500)]">
                {soldiers.length} profiles
              </span>
            </div>
            <StatusBadge tone="muted">SIMULATED RELATIVE INDICES</StatusBadge>
          </div>
          <div className="grid gap-2 p-3 md:hidden">
            {soldiers.map((s) => <Link key={s.id} href={`/soldiers/${s.id}`} className="rounded-lg border border-[var(--border)] bg-[var(--ink)] p-3 transition-colors hover:border-[var(--cyan)]/30">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[14px] font-medium text-[var(--white)]">{s.displayName ?? s.soldierCode}</div><div className="mt-0.5 font-mono text-[10px] text-[var(--gray-500)]">{s.soldierCode} · {s.role.name}</div></div><StatusBadge tone={s.status === "ACTIVE" ? "cyan" : "neutral"}>{s.status}</StatusBadge></div>
              <div className="mt-2 text-[11px] text-[var(--gray-500)]">{s.role.squad.name} · {s.role.squad.unit.name} · {s.experienceYears} years experience</div>
              <div className="mt-3 grid grid-cols-4 border-t border-[var(--border)] pt-2">{[["MOB", s.baselineMobility], ["END", s.baselineEndurance], ["STR", s.baselineStrength], ["REC", s.baselineRecovery]].map(([label, value]) => <div key={String(label)}><div className="label-xs text-[9px]">{label}</div><div className="mt-0.5 font-mono text-[14px] tabular text-[var(--off-white)]">{value}</div></div>)}</div>
              <div className="mt-2 text-[10px] text-[var(--gray-500)]">{s.fitnessAssessment ? "Assessment recorded" : "No fitness assessment recorded"} · {s.profileProvenance?.replaceAll("_", " ") ?? "Profile source unknown"}</div>
            </Link>)}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
                  <th className="px-4 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">Experience</th>
                  <th className="px-3 py-2.5 font-medium">Age</th>
                  <th className="px-3 py-2.5 font-medium">Height</th>
                  <th className="px-3 py-2.5 font-medium">Weight</th>
                  <th className="px-3 py-2.5 font-medium">Mobility</th>
                  <th className="px-3 py-2.5 font-medium">Endurance</th>
                  <th className="px-3 py-2.5 font-medium">Recovery</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {soldiers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--cyan-dim)]/35"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/soldiers/${s.id}`}
                        className="mono tabular text-[var(--cyan)] hover:underline"
                      >
                        {s.soldierCode}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[var(--off-white)]">
                      <Link href={`/soldiers/${s.id}`} className="block">
                        <span>{s.role.name}</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--gray-500)]">
                          {s.role.squad.name} · {s.role.squad.unit.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/soldiers/${s.id}`}>
                        <span className="mono tabular text-[var(--cyan)]">
                          {s.experienceYears}
                        </span>
                        <span className="text-[var(--gray-500)]"> yr</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 mono tabular">{s.ageYears ?? "—"}</td>
                    <td className="px-3 py-2 mono tabular">{s.heightCm == null ? "—" : `${s.heightCm} cm`}</td>
                    <td className="px-3 py-2 mono tabular">{s.weightKg == null ? "—" : `${s.weightKg} kg`}</td>
                    <td className="px-3 py-2 mono tabular text-[var(--cyan)]">
                      <Link href={`/soldiers/${s.id}`}>{s.baselineMobility}</Link>
                    </td>
                    <td className="px-3 py-2 mono tabular text-[var(--cyan)]">
                      <Link href={`/soldiers/${s.id}`}>{s.baselineEndurance}</Link>
                    </td>
                    <td className="px-3 py-2 mono tabular text-[var(--cyan)]">
                      <Link href={`/soldiers/${s.id}`}>{s.baselineRecovery}</Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/soldiers/${s.id}`}>
                        <StatusBadge
                          tone={s.status === "ACTIVE" ? "cyan" : "neutral"}
                        >
                          {s.status}
                        </StatusBadge>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </AppShell>
  );
}
