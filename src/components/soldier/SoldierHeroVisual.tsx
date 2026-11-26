"use client";

import { useState } from "react";
import Image from "next/image";
import { Shield, Target } from "lucide-react";

interface SoldierHeroVisualProps {
  soldierCode: string;
  roleName: string;
  squadName: string;
  unitName: string;
  experienceYears: number;
  typicalLoadKg: number;
  className?: string;
}

export function SoldierHeroVisual({
  soldierCode,
  roleName,
  squadName,
  unitName,
  experienceYears,
  typicalLoadKg,
  className = "",
}: SoldierHeroVisualProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`relative w-full rounded-lg border border-[var(--border)] bg-[#0a111e] overflow-hidden flex flex-col justify-between select-none ${className}`}
      style={{ minHeight: "440px" }}
    >
      {/* Background Technical Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(85,216,245,0.06),transparent_70%)] pointer-events-none" />
      <svg
        className="absolute inset-0 h-full w-full opacity-30 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="heroGrid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="rgba(232,236,241,0.05)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#heroGrid)" />
      </svg>

      {/* Top Bar Header Overlay */}
      <div className="relative z-10 flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--ink)]/80 px-4 py-2.5 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--cyan)]" />
          <span className="mono text-[11px] font-semibold text-[var(--white)] tracking-wider uppercase">
            HUMAN MODEL BASELINE
          </span>
        </div>
        <div className="mono text-[10px] text-[var(--gray-500)] tracking-widest">
          REF: {soldierCode} · PROFILE-V2
        </div>
      </div>

      {/* Main Visual Display Area */}
      <div className="relative flex-1 flex items-center justify-center py-4 px-2 overflow-hidden">
        {!imageError ? (
          <div className="relative h-[340px] w-full max-w-[280px]">
            <Image
              src="/assets/soldier-profile/soldier-hero.png"
              alt="Illustrative synthetic profile art; not a personnel photograph"
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              priority
              className="object-contain object-center filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] contrast-[1.05]"
              onError={() => setImageError(true)}
            />
            {/* Subtle Gradient Vignette at Feet */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a111e] to-transparent pointer-events-none" />
          </div>
        ) : (
          /* Layered Vector Silhouette Fallback */
          <AnatomicalSilhouetteFallback />
        )}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--ink)]/90 px-3 py-1 text-center text-[9px] text-[var(--gray-300)]">Illustrative visual · synthetic profile art</div>
      </div>

      {/* Bottom Metadata Bar */}
      <div className="relative z-10 border-t border-[var(--border)] bg-[#080d17] px-4 py-3">
        <div className="grid grid-cols-4 gap-2 text-center text-[11px] mono">
          <div className="border-r border-[var(--border)]/60 pr-2 text-left">
            <div className="text-[9px] uppercase text-[var(--gray-500)] font-medium">SOLDIER CODE</div>
            <div className="font-semibold text-[var(--cyan)] mt-0.5">{soldierCode}</div>
          </div>
          <div className="border-r border-[var(--border)]/60 pr-2 text-left">
            <div className="text-[9px] uppercase text-[var(--gray-500)] font-medium">ROLE</div>
            <div className="font-semibold text-[var(--white)] mt-0.5">{roleName}</div>
          </div>
          <div className="border-r border-[var(--border)]/60 pr-2 text-left">
            <div className="text-[9px] uppercase text-[var(--gray-500)] font-medium">EXPERIENCE</div>
            <div className="font-semibold text-[var(--white)] mt-0.5">{experienceYears} YRS</div>
          </div>
          <div className="text-left">
            <div className="text-[9px] uppercase text-[var(--gray-500)] font-medium">TYPICAL LOAD</div>
            <div className="font-semibold text-[var(--white)] mt-0.5">{typicalLoadKg} KG</div>
          </div>
        </div>
        <div className="mt-2 border-t border-[var(--border)] pt-2 text-[10px] text-[var(--gray-500)]">{squadName} · {unitName}</div>
      </div>
    </div>
  );
}

function AnatomicalSilhouetteFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
      <Target className="h-16 w-16 text-[var(--cyan)]/40" />
      <div className="mono text-[12px] text-[var(--gray-300)]">
        ANATOMICAL PROFILE MODEL ACTIVE
      </div>
      <div className="text-[10px] text-[var(--gray-500)] max-w-[200px]">
        Standardized baseline biomechanical model representation
      </div>
    </div>
  );
}
