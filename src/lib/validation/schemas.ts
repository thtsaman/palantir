import { z } from "zod";

export const terrainSchema = z.enum([
  "FLAT",
  "ROLLING",
  "MOUNTAIN",
  "STEEP_MOUNTAIN",
  "MIXED",
]);

export const timeOfDaySchema = z.enum(["DAY", "NIGHT"]);

export const soldierCreateSchema = z.object({
  soldierCode: z.string().min(1).max(32),
  roleId: z.string().min(1),
  experienceYears: z.number().int().min(0).max(40),
  baselineMobility: z.number().int().min(0).max(100),
  baselineEndurance: z.number().int().min(0).max(100),
  baselineStrength: z.number().int().min(0).max(100),
  baselineRecovery: z.number().int().min(0).max(100),
  typicalLoadKg: z.number().min(0).max(50),
  status: z.string().optional(),
});

export const soldierCsvRowSchema = z.object({
  soldierCode: z.string().min(1),
  role: z.string().min(1),
  experienceYears: z.coerce.number().int().min(0).max(40),
  baselineMobility: z.coerce.number().int().min(0).max(100),
  baselineEndurance: z.coerce.number().int().min(0).max(100),
  baselineStrength: z.coerce.number().int().min(0).max(100),
  baselineRecovery: z.coerce.number().int().min(0).max(100),
  typicalLoadKg: z.coerce.number().min(0).max(50),
});

export const missionScenarioSchema = z.object({
  name: z.string().min(1).max(120),
  terrainType: terrainSchema,
  altitudeMeters: z.number().int().min(0).max(9000),
  temperatureCelsius: z.number().min(-50).max(55),
  loadKg: z.number().min(0).max(50),
  distanceKm: z.number().min(0).max(100),
  durationMinutes: z.number().int().min(15).max(24 * 60),
  restMinutes: z.number().int().min(0).max(180),
  timeOfDay: timeOfDaySchema,
  description: z.string().optional(),
  soldierId: z.string().optional().nullable(),
  sourceOperationId: z.string().optional().nullable(),
});

export const simulationRequestSchema = z.object({
  scenarioId: z.string().optional(),
  soldierId: z.string().optional().nullable(),
  scenario: missionScenarioSchema.optional(),
});

export const compareScenariosSchema = z.object({
  baseline: missionScenarioSchema.omit({ name: true, description: true, soldierId: true, sourceOperationId: true }).extend({
    name: z.string().optional(),
  }),
  modified: missionScenarioSchema.omit({ name: true, description: true, soldierId: true, sourceOperationId: true }).extend({
    name: z.string().optional(),
  }),
  soldierId: z.string().optional().nullable(),
});

export const similarScenariosSchema = z.object({
  terrainType: terrainSchema,
  altitudeMeters: z.number(),
  temperatureCelsius: z.number(),
  durationMinutes: z.number(),
  timeOfDay: timeOfDaySchema,
  loadKg: z.number().optional(),
  restMinutes: z.number().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export const analyzeOperationSchema = z.object({
  rawText: z.string().min(20).max(100_000),
});

export const operationAnalysisResultSchema = z.object({
  title: z.string(),
  region: z.string(),
  terrain: terrainSchema.or(z.string()),
  altitudeBand: z.string(),
  temperatureBand: z.string(),
  duration: z.string(),
  timeOfDay: z.string(),
  weather: z.string(),
  personnelSummary: z.string(),
  environmentalFactors: z.union([z.string(), z.array(z.string())]),
  observedHumanFactors: z.union([z.string(), z.array(z.string())]),
  keyObservations: z.array(z.string()),
  lessons: z.array(
    z.union([
      z.string(),
      z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
      }),
    ])
  ),
  tags: z.array(z.string()).optional(),
});

export type SoldierCreateInput = z.infer<typeof soldierCreateSchema>;
export type MissionScenarioInput = z.infer<typeof missionScenarioSchema>;
export type OperationAnalysisResult = z.infer<typeof operationAnalysisResultSchema>;
