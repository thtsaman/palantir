/**
 * Simulation types — prototype relative indices, not clinical measurements.
 */

export type TerrainType =
  | "FLAT"
  | "ROLLING"
  | "MOUNTAIN"
  | "STEEP_MOUNTAIN"
  | "MIXED";

export type TimeOfDay = "DAY" | "NIGHT";

export interface SoldierBaseline {
  baselineMobility: number;
  baselineEndurance: number;
  baselineStrength: number;
  baselineRecovery: number;
  experienceYears: number;
  typicalLoadKg: number;
}

export interface MissionInputs {
  terrainType: TerrainType;
  altitudeMeters: number;
  temperatureCelsius: number;
  loadKg: number;
  distanceKm: number;
  durationMinutes: number;
  restMinutes: number;
  timeOfDay: TimeOfDay;
}

export interface NormalizedFactors {
  loadFactor: number;
  altitudeFactor: number;
  temperatureFactor: number;
  terrainFactor: number;
  durationFactor: number;
  distanceFactor: number;
  recoveryFactor: number;
  nightFactor: number;
  environmentStress: number;
}

export interface PerformancePoint {
  timeMinutes: number;
  fatigue: number;
  mobility: number;
  endurance: number;
  performance: number;
}

export interface SimulationResult {
  factors: NormalizedFactors;
  snapshots: PerformancePoint[];
  final: PerformancePoint;
  explanations: string[];
}

export interface ScenarioComparisonResult {
  baseline: SimulationResult;
  modified: SimulationResult;
  deltas: {
    fatigue: number;
    mobility: number;
    endurance: number;
    performance: number;
  };
  primaryChanges: Array<{ label: string; from: string; to: string }>;
}

export interface SimilarityInput {
  terrainType: TerrainType;
  altitudeMeters: number;
  temperatureCelsius: number;
  durationMinutes: number;
  timeOfDay: TimeOfDay;
  loadKg?: number;
  restMinutes?: number;
}

export interface SimilarityMatch {
  id: string;
  title: string;
  similarity: number;
}
