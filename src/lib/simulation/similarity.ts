import { clamp01 } from "./factors";
import type { SimilarityInput, SimilarityMatch, TerrainType } from "./types";

const TERRAIN_ORD: Record<TerrainType, number> = {
  FLAT: 0,
  ROLLING: 1,
  MIXED: 2,
  MOUNTAIN: 3,
  STEEP_MOUNTAIN: 4,
};

function terrainDist(a: TerrainType, b: TerrainType): number {
  return Math.abs(TERRAIN_ORD[a] - TERRAIN_ORD[b]) / 4;
}

/**
 * Weighted mathematical scenario similarity (0–1).
 * No ML required. Optional embeddings can wrap this later when AI is configured.
 */
export function scenarioSimilarity(
  query: SimilarityInput,
  candidate: SimilarityInput
): number {
  const dTerrain = terrainDist(query.terrainType, candidate.terrainType);
  const dAlt = Math.abs(query.altitudeMeters - candidate.altitudeMeters) / 4500;
  const dTemp =
    Math.abs(query.temperatureCelsius - candidate.temperatureCelsius) / 50;
  const dDur =
    Math.abs(query.durationMinutes - candidate.durationMinutes) / (14 * 60);
  const dTod = query.timeOfDay === candidate.timeOfDay ? 0 : 1;
  const dLoad =
    query.loadKg != null && candidate.loadKg != null
      ? Math.abs(query.loadKg - candidate.loadKg) / 35
      : 0;
  const dRest =
    query.restMinutes != null && candidate.restMinutes != null
      ? Math.abs(query.restMinutes - candidate.restMinutes) / 60
      : 0;

  const distance =
    dTerrain * 0.22 +
    clamp01(dAlt) * 0.2 +
    clamp01(dTemp) * 0.16 +
    clamp01(dDur) * 0.16 +
    dTod * 0.1 +
    clamp01(dLoad) * 0.1 +
    clamp01(dRest) * 0.06;

  return Math.round((1 - clamp01(distance)) * 1000) / 1000;
}

export function rankSimilarScenarios(
  query: SimilarityInput,
  candidates: Array<SimilarityInput & { id: string; title: string }>,
  limit = 5
): SimilarityMatch[] {
  return candidates
    .map((c) => ({
      id: c.id,
      title: c.title,
      similarity: scenarioSimilarity(query, c),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/** Convert altitude band strings like "3000-4000m" to midpoint meters */
export function parseAltitudeBand(band: string): number {
  const nums = band.match(/-?\d+/g)?.map(Number) ?? [];
  if (nums.length >= 2) return (nums[0]! + nums[1]!) / 2;
  if (nums.length === 1) return nums[0]!;
  return 2000;
}

/** Convert temperature band like "-10 to 0" to midpoint °C */
export function parseTemperatureBand(band: string): number {
  const nums = band.match(/-?\d+/g)?.map(Number) ?? [];
  if (nums.length >= 2) return (nums[0]! + nums[1]!) / 2;
  if (nums.length === 1) return nums[0]!;
  return 5;
}
