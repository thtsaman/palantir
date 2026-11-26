import type { TerrainType } from "@/lib/simulation/types";

export interface TerrainProfile {
  amplitude: number;
  color: string;
  accent: string;
  vegetation: "none" | "sparse" | "forest";
  roughness: number;
}

/** Stylized display profiles only; these are not maps or validated terrain data. */
export const TERRAIN_PROFILES: Record<TerrainType, TerrainProfile> = {
  FLAT: { amplitude: 0.12, color: "#566b59", accent: "#82906b", vegetation: "sparse", roughness: 0.9 },
  ROLLING: { amplitude: 0.42, color: "#415f50", accent: "#7a8c64", vegetation: "sparse", roughness: 0.95 },
  MOUNTAIN: { amplitude: 1, color: "#46515a", accent: "#98a0a2", vegetation: "sparse", roughness: 0.96 },
  STEEP_MOUNTAIN: { amplitude: 1.5, color: "#343d49", accent: "#9da6aa", vegetation: "none", roughness: 1 },
  MIXED: { amplitude: 0.7, color: "#465653", accent: "#74816b", vegetation: "sparse", roughness: 0.9 },
  DESERT: { amplitude: 0.32, color: "#a78556", accent: "#d0ad70", vegetation: "none", roughness: 1 },
  FOREST: { amplitude: 0.58, color: "#294638", accent: "#548052", vegetation: "forest", roughness: 0.92 },
};

export function terrainProfile(type: TerrainType): TerrainProfile {
  return TERRAIN_PROFILES[type];
}
