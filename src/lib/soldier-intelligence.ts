import type { MissionInputs, SoldierBaseline } from "@/lib/simulation/types";
import { runSimulation } from "@/lib/simulation/simulation";

export type EnvironmentCategory =
  | "MOUNTAINOUS"
  | "HILLY"
  | "FOREST"
  | "PLAINS"
  | "EXTREME_COLD"
  | "HOT";

export interface EnvironmentAssessment {
  category: EnvironmentCategory;
  label: string;
  status: "EVIDENCE_AVAILABLE" | "INSUFFICIENT_DATA";
  supporting: string[];
  strengths: string[];
  limitations: string[];
  missing: string[];
  confidence: "LOW" | "NOT_ASSESSED";
  explanation: string;
}

type SoldierEvidence = Pick<
  SoldierBaseline,
  | "baselineMobility"
  | "baselineEndurance"
  | "baselineStrength"
  | "baselineRecovery"
  | "experienceYears"
  | "typicalLoadKg"
> & {
  fitnessAssessment?: string | null;
  mobilityProvenance?: string | null;
  enduranceProvenance?: string | null;
  typicalLoadProvenance?: string | null;
};

const labels: Record<EnvironmentCategory, string> = {
  MOUNTAINOUS: "Mountainous terrain",
  HILLY: "Hilly terrain",
  FOREST: "Forest terrain",
  PLAINS: "Plains",
  EXTREME_COLD: "Extreme cold",
  HOT: "Hot environments",
};

const relevant: Record<EnvironmentCategory, Array<keyof SoldierEvidence>> = {
  MOUNTAINOUS: ["baselineEndurance", "baselineMobility", "typicalLoadKg"],
  HILLY: ["baselineEndurance", "baselineMobility", "typicalLoadKg"],
  FOREST: ["baselineMobility", "baselineEndurance"],
  PLAINS: ["baselineEndurance", "typicalLoadKg"],
  EXTREME_COLD: [],
  HOT: [],
};

const missingByCategory: Record<EnvironmentCategory, string[]> = {
  MOUNTAINOUS: ["Elevation and incline assessment", "Terrain-specific field assessment"],
  HILLY: ["Slope, surface and distance assessment"],
  FOREST: ["Terrain-specific movement or navigation assessment"],
  PLAINS: ["Distance and sustained movement assessment"],
  EXTREME_COLD: ["Cold exposure, clothing, acclimatization and cold-weather assessment"],
  HOT: ["Heat exposure, hydration, acclimatization and heat assessment"],
};

export function assessEnvironment(soldier: SoldierEvidence): EnvironmentAssessment[] {
  const categories = Object.keys(labels) as EnvironmentCategory[];
  return categories.map((category) => {
    const availableKeys = relevant[category].filter((key) =>
      typeof soldier[key] === "number"
    );
    const supporting = availableKeys.map((key) => {
      const name = key === "typicalLoadKg" ? "Typical carried load" : String(key).replace("baseline", "Baseline ");
      const value = soldier[key];
      const provenanceKey = key === "baselineMobility" ? "mobilityProvenance" : key === "baselineEndurance" ? "enduranceProvenance" : key === "typicalLoadKg" ? "typicalLoadProvenance" : null;
      const provenance = provenanceKey ? soldier[provenanceKey] : null;
      return `${name}: ${value}${key === "typicalLoadKg" ? " kg" : key === "experienceYears" ? " years" : "/100"} · source ${provenance?.replaceAll("_", " ") ?? "not recorded"}`;
    });
    const strengths: string[] = [];
    const limitations: string[] = availableKeys.length
      ? ["No validated reference ranges are configured; baseline values cannot be classified as a strength or limitation."]
      : [];
    return {
      category,
      label: labels[category],
      status: supporting.length ? "EVIDENCE_AVAILABLE" as const : "INSUFFICIENT_DATA" as const,
      supporting,
      strengths,
      limitations,
      missing: missingByCategory[category],
      confidence: supporting.length ? "LOW" as const : "NOT_ASSESSED" as const,
      explanation: supporting.length
        ? "This panel reports which stored profile fields may be relevant. They do not establish suitability or predict performance in this environment."
        : "The stored profile has no category-specific evidence sufficient to make even a limited assessment.",
    };
  });
}

export function assessWorkload(
  baseline: SoldierBaseline,
  inputs: Omit<MissionInputs, "loadKg"> & { loadKg: number }
) {
  const reference = runSimulation({ ...inputs, loadKg: baseline.typicalLoadKg }, baseline);
  const requested = runSimulation(inputs, baseline);
  return {
    reference,
    requested,
    changes: {
      fatigue: round1(requested.final.fatigue - reference.final.fatigue),
      mobility: round1(requested.final.mobility - reference.final.mobility),
      endurance: round1(requested.final.endurance - reference.final.endurance),
    },
    assumptions: [
      "Uses the existing deterministic prototype simulation model.",
      "All non-load mission conditions are held constant against the soldier's typical-load reference.",
      "Typical load is a comparison input only, not a safety limit or deployment recommendation.",
    ],
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
