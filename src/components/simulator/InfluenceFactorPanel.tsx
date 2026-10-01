"use client";

import React, { useState } from "react";
import { ChevronRight, Zap } from "lucide-react";
import { Panel } from "@/components/ui/primitives";

interface InfluenceFactorPanelProps {
  loadKg?: number;
  altitudeMeters?: number;
  temperatureCelsius?: number;
  terrainType?: string;
  durationMinutes?: number;
  restMinutes?: number;
  explanations?: string[];
  className?: string;
}

export function InfluenceFactorPanel({
  loadKg = 18,
  altitudeMeters = 3500,
  temperatureCelsius = -5,
  terrainType = "Mountain",
  durationMinutes = 480,
  restMinutes = 15,
  explanations = [],
  className = "",
}: InfluenceFactorPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Panel className={`!p-0 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--gray-800)]/40 transition-colors select-none"
        aria-expanded={isOpen}
      >
        <div>
          <div className="text-[13px] font-semibold text-[var(--white)]">
            WHY DID PERFORMANCE CHANGE?
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--gray-500)]">
            Deterministic model factors & workload stress breakdown
          </div>
        </div>
        <span
          className={`mono text-[12px] text-[var(--cyan)] transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          ›
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-[var(--border)] p-4 space-y-3.5 bg-[#080e19]">
          {/* Factor Influence Progress Bars */}
          <div className="space-y-2.5">
            <FactorRow label={`LOAD (${loadKg} kg)`} percentage={42} desc="Carried equipment weight" />
            <FactorRow label={`ALTITUDE (${altitudeMeters} m)`} percentage={35} desc="Hypoxic metabolic demand" />
            <FactorRow label={`TERRAIN (${terrainType})`} percentage={26} desc="Gradient & movement cost" />
            <FactorRow label={`TEMPERATURE (${temperatureCelsius}°C)`} percentage={22} desc="Thermal regulation cost" />
            <FactorRow label={`REST (${restMinutes} min)`} percentage={-15} desc="Recovery period impact" />
          </div>

          {/* Text Explanations */}
          {explanations.length > 0 && (
            <ul className="space-y-1.5 border-t border-[var(--border)]/60 pt-3 text-[11px] text-[var(--gray-300)]">
              {explanations.map((line, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-[var(--cyan)] font-mono text-[12px]">▸</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded bg-[#060b13] p-2.5 border border-[var(--border)] text-[11px] text-[var(--gray-300)] flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--cyan)] shrink-0" />
            <span>
              Higher load, prolonged duration and limited recovery increase simulated fatigue.
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
}

function FactorRow({
  label,
  percentage,
  desc,
}: {
  label: string;
  percentage: number;
  desc: string;
}) {
  const isNegative = percentage < 0;
  const absVal = Math.abs(percentage);

  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="font-mono text-[var(--white)] font-medium">{label}</span>
        <span className="mono text-[var(--gray-300)] font-semibold">
          {isNegative ? `${percentage}% (recovery)` : `+${percentage}% fatigue`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--gray-800)] overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isNegative ? "bg-[var(--gray-500)]" : "bg-[var(--cyan)]"
          }`}
          style={{ width: `${Math.min(100, absVal * 2.2)}%` }}
        />
      </div>
      <div className="text-[9px] text-[var(--gray-500)] mt-0.5">{desc}</div>
    </div>
  );
}
