"use client";

import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

export type EchelonLevel = "SOLDIER" | "SQUAD" | "PLATOON" | "COMPANY" | "UNIT";
export type CameraMode = "OVERVIEW" | "FOLLOW" | "TOP";
export type ViewType = "3D" | "TOPOGRAPHIC";

const ECHELONS: EchelonLevel[] = ["SOLDIER", "SQUAD", "PLATOON", "COMPANY", "UNIT"];

export function EchelonBar({ currentEchelon, availableEchelons, memberCount, onSelectEchelon, cameraMode, onSelectCameraMode, viewType, onSelectViewType, soldierCode = "", className = "" }: {
  currentEchelon: EchelonLevel; availableEchelons: EchelonLevel[]; memberCount: number;
  onSelectEchelon: (echelon: EchelonLevel) => void; cameraMode: CameraMode;
  onSelectCameraMode: (mode: CameraMode) => void; viewType: ViewType;
  onSelectViewType: (view: ViewType) => void; soldierCode?: string; className?: string;
}) {
  const breadcrumb = `${currentEchelon}${soldierCode && currentEchelon === "SOLDIER" ? ` / ${soldierCode}` : ""} · ${memberCount} saved member${memberCount === 1 ? "" : "s"}`;
  return <div className={`rounded-lg border border-[var(--border)] bg-[#090f1b] p-3 space-y-3 select-none ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/60 pb-2.5"><div className="flex items-center gap-2"><Layers className="h-4 w-4 text-[var(--cyan)]"/><span className="mono text-[11px] font-semibold text-[var(--white)] tracking-wider uppercase">Saved roster scale</span></div><div className="flex flex-wrap items-center gap-1 rounded border border-[var(--border)] bg-[#060b13] p-1">{ECHELONS.map((level) => { const active = currentEchelon === level; const available = availableEchelons.includes(level); return <button key={level} type="button" disabled={!available} title={available ? `Show saved ${level.toLowerCase()} roster` : `No saved ${level.toLowerCase()} assignment is available for this soldier`} onClick={() => onSelectEchelon(level)} className={cn("rounded px-2 py-1 text-[10px] mono font-medium disabled:cursor-not-allowed disabled:opacity-35", active ? "bg-[var(--cyan-dim)] text-[var(--cyan)] border border-[var(--cyan)]/40" : "text-[var(--gray-400)] hover:text-[var(--white)]")}>{level}</button>; })}</div></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[#060b13] p-1 text-[10px] mono"><span className="px-1 text-[var(--gray-500)]">CAM:</span>{(["OVERVIEW", "FOLLOW", "TOP"] as CameraMode[]).map((mode) => <button key={mode} type="button" onClick={() => onSelectCameraMode(mode)} className={cn("rounded px-2 py-1", cameraMode === mode ? "bg-[var(--cyan)] text-[#0B1220] font-semibold" : "text-[var(--gray-300)]")}>{mode}</button>)}</div><div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[#060b13] p-1 text-[10px] mono">{(["3D", "TOPOGRAPHIC"] as ViewType[]).map((view) => <button key={view} type="button" onClick={() => onSelectViewType(view)} className={cn("rounded px-2 py-1", viewType === view ? "bg-[var(--cyan-dim)] text-[var(--cyan)] font-semibold" : "text-[var(--gray-400)]")}>{view}</button>)}</div></div>
    <div className="rounded border border-[var(--border)] bg-[#060b13] px-3 py-1.5 text-[11px] mono text-[var(--cyan)]">PERSISTED ROSTER / {breadcrumb}</div>
    {!availableEchelons.includes("PLATOON") && !availableEchelons.includes("COMPANY") ? <p className="text-[10px] text-[var(--gray-500)]">Assign this squad to a platoon and company in Organization to enable those roster views.</p> : null}
  </div>;
}
