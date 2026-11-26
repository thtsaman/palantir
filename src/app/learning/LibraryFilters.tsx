"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function LibraryFilters({ terrain, condition, category, from, to, q }: { terrain: string; condition: string; category: string; from: string; to: string; q: string }) {
  const router = useRouter(); const current = useSearchParams();
  function set(key: string, value: string) { const params = new URLSearchParams(current.toString()); if (value) params.set(key, value); else params.delete(key); const query = params.toString(); router.push(query ? `/learning?${query}#library` : "/learning#library"); }
  const control = "rounded border border-[var(--border)] bg-[var(--ink)] px-3 py-2 text-[12px] text-[var(--off-white)]";
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6"><input className={control} placeholder="Search title, report, lessons" value={q} onChange={(e) => set("q", e.target.value)} /><select className={control} value={terrain} onChange={(e) => set("terrain", e.target.value)}><option value="">All terrain</option>{["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"].map((v) => <option key={v}>{v}</option>)}</select><input className={control} placeholder="Mission category" value={category} onChange={(e) => set("category", e.target.value)} /><input className={control} placeholder="Conditions / context" value={condition} onChange={(e) => set("condition", e.target.value)} /><input className={control} aria-label="From event date" type="date" value={from} onChange={(e) => set("from", e.target.value)} /><input className={control} aria-label="To event date" type="date" value={to} onChange={(e) => set("to", e.target.value)} /></div>;
}
