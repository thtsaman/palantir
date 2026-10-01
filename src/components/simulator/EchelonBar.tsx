"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Play, Eye, Layers, Compass, Video } from "lucide-react";

export type EchelonLevel = "SOLDIER" | "SQUAD" | "PLATOON" | "COMPANY" | "BATTALION";
export type CameraMode = "OVERVIEW" | "FOLLOW" | "TOP";
export type ViewType = "3D" | "TOPOGRAPHIC";

interface EchelonBarProps {
  currentEchelon: EchelonLevel;
  onSelectEchelon: (echelon: EchelonLevel) => void;
  cameraMode: CameraMode;
  onSelectCameraMode: (mode: CameraMode) => void;
  viewType: ViewType;
  onSelectViewType: (view: ViewType) => void;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  soldierCode?: string;
  className?: string;
}

const ECHELONS: EchelonLevel[] = ["SOLDIER", "SQUAD", "PLATOON", "COMPANY", "BATTALION"];

export function EchelonBar({
  currentEchelon,
  onSelectEchelon,
  cameraMode,
  onSelectCameraMode,
  viewType,
  onSelectViewType,
  isDemoMode,
  onToggleDemoMode,
  soldierCode = "S-107",
  className = "",
}: EchelonBarProps) {
  // Breadcrumb string based on selected echelon
  const breadcrumb = getBreadcrumb(currentEchelon, soldierCode);

  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[#090f1b] p-3 space-y-3 select-none ${className}`}>
      {/* Top Row: Echelon Lens Selector & Demo Mode Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--cyan)]" />
          <span className="mono text-[11px] font-semibold text-[var(--white)] tracking-wider uppercase">
            SIMULATION SCALE / ECHELON LENS
          </span>
        </div>

        {/* Demo Mode Button */}
        <button
          onClick={onToggleDemoMode}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] mono font-semibold transition-all duration-200 border",
            isDemoMode
              ? "bg-[var(--cyan)] text-[#0B1220] border-[var(--cyan)] shadow-[0_0_12px_rgba(85,216,245,0.4)]"
              : "bg-[#0c1626] text-[var(--cyan)] border-[var(--cyan)]/40 hover:border-[var(--cyan)]"
          )}
        >
          <Play className="h-3 w-3 fill-current" />
          <span>{isDemoMode ? "DEMO MODE ACTIVE" : "GUIDED DEMO MODE"}</span>
        </button>
      </div>

      {/* Middle Row: Echelon Level Progression Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#060b13] p-1 rounded border border-[var(--border)]">
          {ECHELONS.map((lvl) => {
            const active = currentEchelon === lvl;
            return (
              <button
                key={lvl}
                onClick={() => onSelectEchelon(lvl)}
                className={cn(
                  "rounded px-3 py-1 text-[11px] mono font-medium transition-colors duration-150",
                  active
                    ? "bg-[var(--cyan-dim)] text-[var(--cyan)] font-semibold border border-[var(--cyan)]/40"
                    : "text-[var(--gray-500)] hover:text-[var(--white)] hover:bg-[var(--gray-800)]/40"
                )}
              >
                {lvl}
              </button>
            );
          })}
        </div>

        {/* Camera View & 3D / Topo Toggles */}
        <div className="flex items-center gap-3">
          {/* Camera Preset Selector */}
          <div className="flex items-center gap-1 bg-[#060b13] p-1 rounded border border-[var(--border)] text-[10px] mono">
            <span className="text-[var(--gray-500)] px-1">CAM:</span>
            {(["OVERVIEW", "FOLLOW", "TOP"] as CameraMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onSelectCameraMode(mode)}
                className={cn(
                  "rounded px-2 py-0.5 transition-colors",
                  cameraMode === mode
                    ? "bg-[var(--cyan)] text-[#0B1220] font-semibold"
                    : "text-[var(--gray-300)] hover:text-[var(--white)]"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* 3D vs Topo Toggle */}
          <div className="flex items-center gap-1 bg-[#060b13] p-1 rounded border border-[var(--border)] text-[10px] mono">
            {(["3D", "TOPOGRAPHIC"] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => onSelectViewType(v)}
                className={cn(
                  "rounded px-2 py-0.5 transition-colors",
                  viewType === v
                    ? "bg-[var(--cyan-dim)] text-[var(--cyan)] font-semibold"
                    : "text-[var(--gray-500)] hover:text-[var(--white)]"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Echelon Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-[11px] mono text-[var(--gray-300)] bg-[#060b13] px-3 py-1.5 rounded border border-[var(--border)]">
        <span className="text-[var(--gray-500)]">HIERARCHY:</span>
        <span className="text-[var(--cyan)] font-semibold">{breadcrumb}</span>
      </div>
    </div>
  );
}

function getBreadcrumb(echelon: EchelonLevel, soldierCode: string) {
  switch (echelon) {
    case "BATTALION":
      return "DEMO BATTALION 1ST DIV";
    case "COMPANY":
      return "DEMO BATTALION / ALPHA CO";
    case "PLATOON":
      return "ALPHA CO / 2ND PLATOON";
    case "SQUAD":
      return "2ND PLATOON / SQUAD 3";
    case "SOLDIER":
    default:
      return `BATTALION / ALPHA / PLATOON 2 / SQUAD 3 / ${soldierCode}`;
  }
}
