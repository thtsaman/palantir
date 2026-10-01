import type { MissionInputs, NormalizedFactors, TerrainType } from "./types";

/** Clamp to [0, 1] */
export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Clamp to [0, 100] */
export function clamp100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

const TERRAIN_WEIGHT: Record<TerrainType, number> = {
  FLAT: 0.15,
  ROLLING: 0.35,
  MOUNTAIN: 0.65,
  STEEP_MOUNTAIN: 0.9,
  MIXED: 0.5,
};

/**
 * Normalize mission inputs into 0–1 factors.
 * Ranges are prototype heuristics for relative stress modelling.
 */
export function normalizeFactors(inputs: MissionInputs): NormalizedFactors {
  const loadFactor = clamp01((inputs.loadKg - 5) / 35); // 5–40 kg
  const altitudeFactor = clamp01((inputs.altitudeMeters - 500) / 4500); // 500–5000 m
  // Cold and heat both increase stress; comfort ~15°C
  const tempDelta = Math.abs(inputs.temperatureCelsius - 15);
  const temperatureFactor = clamp01(tempDelta / 40);
  const terrainFactor = TERRAIN_WEIGHT[inputs.terrainType] ?? 0.5;
  const durationFactor = clamp01((inputs.durationMinutes - 60) / (14 * 60 - 60)); // 1–14 h
  const distanceFactor = clamp01((inputs.distanceKm - 2) / 28); // 2–30 km
  // More rest → higher recovery factor (reduces stress)
  const recoveryFactor = clamp01(inputs.restMinutes / 60);
  const nightFactor = inputs.timeOfDay === "NIGHT" ? 0.25 : 0;

  const environmentStress = clamp01(
    loadFactor * 0.22 +
      altitudeFactor * 0.18 +
      temperatureFactor * 0.14 +
      terrainFactor * 0.18 +
      durationFactor * 0.12 +
      distanceFactor * 0.08 +
      nightFactor * 0.08 -
      recoveryFactor * 0.2
  );

  return {
    loadFactor,
    altitudeFactor,
    temperatureFactor,
    terrainFactor,
    durationFactor,
    distanceFactor,
    recoveryFactor,
    nightFactor,
    environmentStress,
  };
}

export function terrainLabel(t: TerrainType): string {
  return t
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
