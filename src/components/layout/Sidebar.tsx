"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Database,
  Gauge,
  History,
  LayoutDashboard,
  Map,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/soldiers", label: "Soldiers", icon: Users },
  { href: "/missions", label: "Missions", icon: Map },
  { href: "/simulator", label: "Simulator", icon: Gauge },
  { href: "/operations", label: "Operations", icon: History },
  { href: "/what-if", label: "What-If", icon: SlidersHorizontal },
  { href: "/learning", label: "Learning", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-w)] flex-col border-r border-[var(--border)] bg-[var(--ink)]"
      aria-label="Primary"
    >
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="label-xs mb-1">Platform</div>
        <div className="text-[13px] font-semibold leading-snug text-[var(--white)]">
          Human Performance
          <br />
          Simulation
        </div>
        <div className="mt-2">
          <span className="inline-flex rounded-[4px] border border-[var(--border-strong)] px-1.5 py-0.5 text-[9px] tracking-wider text-[var(--gray-500)]">
            DEMO ENVIRONMENT
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[13px] transition-colors duration-150",
                    active
                      ? "bg-[var(--cyan-dim)] text-[var(--cyan)]"
                      : "text-[var(--gray-300)] hover:bg-[var(--gray-800)] hover:text-[var(--white)]"
                  )}
                >
                  <Icon
                    size={16}
                    strokeWidth={1.6}
                    aria-hidden
                    className="shrink-0"
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--border)] px-4 py-3 space-y-2">
        <div className="label-xs">System Status</div>
        <StatusLine icon={<Database size={12} strokeWidth={1.6} />} label="Database Connected" />
        <StatusLine icon={<Gauge size={12} strokeWidth={1.6} />} label="Simulation Engine Ready" />
      </div>
    </aside>
  );
}

function StatusLine({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[var(--gray-500)]">
      <span className="text-[var(--cyan)]">{icon}</span>
      <span className="h-1 w-1 rounded-full bg-[var(--cyan)]" aria-hidden />
      {label}
    </div>
  );
}
