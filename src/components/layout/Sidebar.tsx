"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  Gauge,
  History,
  LayoutDashboard,
  Map,
  Settings,
  SlidersHorizontal,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { title: "Workspace", items: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/soldiers", label: "Personnel", icon: Users },
    { href: "/organization", label: "Organization", icon: Building2 },
  ] },
  { title: "Simulation", items: [
    { href: "/missions", label: "Missions", icon: Map },
    { href: "/simulator", label: "Simulator", icon: Gauge },
    { href: "/what-if", label: "What-If", icon: SlidersHorizontal },
  ] },
  { title: "Intelligence", items: [
    { href: "/operations", label: "Operations", icon: History },
    { href: "/learning", label: "Learning library", icon: Activity },
  ] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="fixed left-3 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--ink-panel)] text-[var(--gray-100)] shadow-lg lg:hidden"><Menu size={18} /></button>
      {mobileOpen ? <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-[var(--border)] bg-[#0d141c] transition-transform duration-200 lg:w-[var(--sidebar-w)] lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")} aria-label="Primary navigation">
        <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-5">
          <div>
            <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--cyan)]"/><span className="label-xs text-[var(--gray-300)]">Defence analysis</span></div>
            <div className="text-[14px] font-semibold leading-snug tracking-tight text-[var(--white)]">Human Performance</div>
            <div className="mt-1 text-[11px] text-[var(--gray-500)]">Simulation · readiness · learning</div>
          </div>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="rounded p-1 text-[var(--gray-500)] hover:text-[var(--white)] lg:hidden"><X size={18}/></button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {NAV.map((section) => <div key={section.title}>
            <div className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">{section.title}</div>
            <ul className="space-y-1">{section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return <li key={item.href}><Link href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={cn("group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] transition-colors duration-150", active ? "border-[var(--cyan)]/20 bg-[var(--cyan-dim)] font-medium text-[var(--cyan)]" : "border-transparent text-[var(--gray-300)] hover:border-[var(--border)] hover:bg-white/[0.035] hover:text-[var(--white)]")}><Icon size={16} strokeWidth={1.7} aria-hidden className="shrink-0"/><span>{item.label}</span>{active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--cyan)]"/> : null}</Link></li>;
            })}</ul>
          </div>)}
        </nav>
        <div className="border-t border-[var(--border)] px-3 py-3"><Link href="/settings" onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px]", pathname.startsWith("/settings") ? "bg-[var(--cyan-dim)] text-[var(--cyan)]" : "text-[var(--gray-300)] hover:bg-white/[0.035]")}><Settings size={16}/><span>Settings</span></Link><div className="mt-3 flex items-center gap-2 px-3 text-[10px] text-[var(--gray-500)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--signal)]"/>Synthetic training environment</div></div>
      </aside>
    </>
  );
}
