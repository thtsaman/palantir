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
    <AppShell title="Soldiers · Soldier Library" meta={<StatusBadge tone="muted">DEMO DATA</StatusBadge>}>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
                  <th className="px-4 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">Experience</th>
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
