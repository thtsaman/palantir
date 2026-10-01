import { describe, expect, it } from "vitest";
import {
  compareScenarios,
  normalizeFactors,
  runSimulation,
  scenarioSimilarity,
} from "@/lib/simulation";
import type { MissionInputs } from "@/lib/simulation";

const base: MissionInputs = {
  terrainType: "MOUNTAIN",
  altitudeMeters: 3500,
  temperatureCelsius: -5,
  loadKg: 18,
  distanceKm: 12,
  durationMinutes: 480,
  restMinutes: 15,
  timeOfDay: "NIGHT",
};

describe("simulation engine", () => {
  it("keeps metrics between 0 and 100", () => {
    const result = runSimulation(base);
    for (const s of result.snapshots) {
      for (const key of ["fatigue", "mobility", "endurance", "performance"] as const) {
        expect(s[key]).toBeGreaterThanOrEqual(0);
        expect(s[key]).toBeLessThanOrEqual(100);
      }
    }
  });

  it("increasing load should not increase simulated performance", () => {
    const light = runSimulation({ ...base, loadKg: 12 });
    const heavy = runSimulation({ ...base, loadKg: 28 });
    expect(heavy.final.performance).toBeLessThanOrEqual(light.final.performance);
  });

  it("increasing rest should reduce fatigue relative to identical scenario", () => {
    const shortRest = runSimulation({ ...base, restMinutes: 10 });
    const longRest = runSimulation({ ...base, restMinutes: 45 });
    expect(longRest.final.fatigue).toBeLessThanOrEqual(shortRest.final.fatigue);
  });

  it("longer duration should increase cumulative fatigue", () => {
    const short = runSimulation({ ...base, durationMinutes: 180 });
    const long = runSimulation({ ...base, durationMinutes: 600 });
    expect(long.final.fatigue).toBeGreaterThanOrEqual(short.final.fatigue);
  });

  it("is deterministic", () => {
    const a = runSimulation(base);
    const b = runSimulation(base);
    expect(a.final).toEqual(b.final);
    expect(a.snapshots).toEqual(b.snapshots);
  });
});

describe("factor normalization", () => {
  it("returns factors in 0–1", () => {
    const f = normalizeFactors(base);
    for (const v of Object.values(f)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("scenario comparison", () => {
  it("is deterministic and reflects load/rest changes", () => {
    const modified = { ...base, loadKg: 14, restMinutes: 30 };
    const a = compareScenarios(base, modified);
    const b = compareScenarios(base, modified);
    expect(a.deltas).toEqual(b.deltas);
    expect(a.modified.final.performance).toBeGreaterThanOrEqual(
      a.baseline.final.performance
    );
    expect(a.primaryChanges.length).toBeGreaterThan(0);
  });
});

describe("similarity", () => {
  it("ranks identical scenarios highest", () => {
    const score = scenarioSimilarity(base, base);
    expect(score).toBeGreaterThan(0.95);
  });

  it("scores distant scenarios lower", () => {
    const far = scenarioSimilarity(base, {
      ...base,
      terrainType: "FLAT",
      altitudeMeters: 500,
      temperatureCelsius: 25,
      durationMinutes: 120,
      timeOfDay: "DAY",
    });
    expect(far).toBeLessThan(scenarioSimilarity(base, base));
  });
});
