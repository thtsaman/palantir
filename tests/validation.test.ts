import { describe, expect, it } from "vitest";
import { soldierCsvRowSchema } from "@/lib/validation/schemas";
import { fallbackExtract } from "@/lib/ai/analyze-operation";

describe("CSV validation", () => {
  it("accepts valid rows", () => {
    const row = soldierCsvRowSchema.parse({
      soldierCode: "S-200",
      role: "Infantry",
      experienceYears: "4",
      baselineMobility: "88",
      baselineEndurance: "82",
      baselineStrength: "80",
      baselineRecovery: "76",
      typicalLoadKg: "18",
    });
    expect(row.soldierCode).toBe("S-200");
    expect(row.experienceYears).toBe(4);
  });

  it("rejects invalid baseline metrics", () => {
    const result = soldierCsvRowSchema.safeParse({
      soldierCode: "S-201",
      role: "Infantry",
      experienceYears: 4,
      baselineMobility: 180,
      baselineEndurance: 82,
      baselineStrength: 80,
      baselineRecovery: 76,
      typicalLoadKg: 18,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty soldier code", () => {
    const result = soldierCsvRowSchema.safeParse({
      soldierCode: "",
      role: "Infantry",
      experienceYears: 4,
      baselineMobility: 80,
      baselineEndurance: 82,
      baselineStrength: 80,
      baselineRecovery: 76,
      typicalLoadKg: 18,
    });
    expect(result.success).toBe(false);
  });
});

describe("AI fallback extractor", () => {
  it("extracts structured fields without API key", () => {
    const text = `
Operation: Demo Ridge Walk
Region: Northern Highlands
Terrain: Mountain
Altitude: 3200-3800m
Temperature: -8 to -2°C
Duration: 8 hours
Time: Night
Weather: Cold clear

Observations:
- Heavy load increased fatigue on climbs
- Limited rest reduced recovery between movements
- Night navigation slowed pacing overall
`;
    const result = fallbackExtract(text);
    expect(result.title).toBeTruthy();
    expect(result.terrain).toBe("MOUNTAIN");
    expect(result.timeOfDay).toBe("NIGHT");
    expect(result.keyObservations.length).toBeGreaterThan(0);
    expect(result.lessons.length).toBeGreaterThan(0);
  });
});
