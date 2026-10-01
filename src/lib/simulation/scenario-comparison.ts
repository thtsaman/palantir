import { runSimulation } from "./simulation";
import { terrainLabel } from "./factors";
import type {
  MissionInputs,
  ScenarioComparisonResult,
  SoldierBaseline,
} from "./types";

function diffLabel(
  key: keyof MissionInputs,
  a: MissionInputs,
  b: MissionInputs
): { label: string; from: string; to: string } | null {
  if (a[key] === b[key]) return null;
  const format = (v: MissionInputs[keyof MissionInputs]): string => {
    if (key === "terrainType") return terrainLabel(v as MissionInputs["terrainType"]);
    if (key === "timeOfDay") return String(v);
    if (key === "altitudeMeters") return `${v} m`;
    if (key === "temperatureCelsius") return `${v}°C`;
    if (key === "loadKg") return `${v} kg`;
    if (key === "distanceKm") return `${v} km`;
    if (key === "durationMinutes") return `${Number(v) / 60} h`;
    if (key === "restMinutes") return `${v} min`;
    return String(v);
  };
  const labels: Record<string, string> = {
    terrainType: "Terrain",
    altitudeMeters: "Altitude",
    temperatureCelsius: "Temperature",
    loadKg: "Load",
    distanceKm: "Distance",
    durationMinutes: "Duration",
    restMinutes: "Rest",
    timeOfDay: "Time of Day",
  };
  return {
    label: labels[key] ?? key,
    from: format(a[key]),
    to: format(b[key]),
  };
}

/**
 * Deterministic A vs B scenario comparison using the same simulation engine.
 */
export function compareScenarios(
  baseline: MissionInputs,
  modified: MissionInputs,
  soldier?: Partial<SoldierBaseline>
): ScenarioComparisonResult {
  const a = runSimulation(baseline, soldier);
  const b = runSimulation(modified, soldier);

  const keys: (keyof MissionInputs)[] = [
    "loadKg",
    "restMinutes",
    "altitudeMeters",
    "temperatureCelsius",
    "terrainType",
    "durationMinutes",
    "distanceKm",
    "timeOfDay",
  ];

  const primaryChanges = keys
    .map((k) => diffLabel(k, baseline, modified))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    baseline: a,
    modified: b,
    deltas: {
      fatigue: round1(b.final.fatigue - a.final.fatigue),
      mobility: round1(b.final.mobility - a.final.mobility),
      endurance: round1(b.final.endurance - a.final.endurance),
      performance: round1(b.final.performance - a.final.performance),
    },
    primaryChanges,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
