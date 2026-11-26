import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Panel, StatusBadge } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { OrganizationManager } from "./OrganizationManager";

export const dynamic = "force-dynamic";

export default async function OrganizationPage() {
  const units = await prisma.unit.findMany({
    orderBy: { name: "asc" },
    include: {
      squads: { orderBy: { name: "asc" }, include: { roles: { orderBy: { name: "asc" } } } },
      companies: {
        orderBy: { name: "asc" },
        include: {
          platoons: {
            orderBy: { name: "asc" },
            include: { squads: { orderBy: { name: "asc" }, include: { roles: { orderBy: { name: "asc" } } } } },
          },
        },
      },
    },
  });
  const data = units.map((unit) => ({ id: unit.id, name: unit.name, code: unit.code, squads: unit.squads.map((squad) => ({ id: squad.id, name: squad.name, code: squad.code, platoonId: squad.platoonId, roles: squad.roles.map((role) => ({ id: role.id, name: role.name, code: role.code })) })), companies: unit.companies.map((company) => ({ id: company.id, name: company.name, code: company.code, platoons: company.platoons.map((platoon) => ({ id: platoon.id, name: platoon.name, code: platoon.code, squads: platoon.squads.map((squad) => ({ id: squad.id, name: squad.name, code: squad.code, platoonId: squad.platoonId, roles: squad.roles.map((role) => ({ id: role.id, name: role.name, code: role.code })) })) })) })) }));
  return <AppShell title="Organization · Roster Hierarchy" meta={<StatusBadge tone="muted">SAVED STRUCTURE</StatusBadge>}>
    <PageHeader eyebrow="Roster Management" title="Organization" description="Manage Unit → Company → Platoon → Squad → Role assignments used by roster-backed simulation." />
    {units.length ? <OrganizationManager units={data} /> : <Panel className="!p-5"><p className="text-[13px] text-[var(--gray-300)]">Create a Unit first through the database or the existing admin workflow, then manage its companies, platoons, squads and roles here.</p></Panel>}
  </AppShell>;
}
