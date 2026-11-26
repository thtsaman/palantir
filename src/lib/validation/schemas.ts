import { z } from "zod";

export const terrainSchema = z.enum([
  "FLAT",
  "ROLLING",
  "MOUNTAIN",
  "STEEP_MOUNTAIN",
  "MIXED",
  "DESERT",
  "FOREST",
]);

export const timeOfDaySchema = z.enum(["DAY", "NIGHT"]);

export const dataProvenanceSchema = z.enum([
  "USER_ENTERED",
  "IMPORTED",
  "SYNTHETIC_DEMO",
  "MODEL_GENERATED",
]);

const ageSchema = z.number().int().min(18).max(75).nullable().optional();
const heightSchema = z.number().min(120).max(230).nullable().optional();
const weightSchema = z.number().min(35).max(250).nullable().optional();
const dateSchema = z.string().date().nullable().optional();

export const soldierProfileFieldsSchema = z.object({
  displayName: z.string().trim().min(1).max(80).nullable().optional(),
  ageYears: ageSchema,
  heightCm: heightSchema,
  weightKg: weightSchema,
  fitnessAssessment: z.string().trim().max(1000).nullable().optional(),
  assessmentDate: dateSchema,
  assessmentSource: z.string().trim().max(200).nullable().optional(),
  profileProvenance: dataProvenanceSchema.optional(),
  profileSource: z.string().trim().max(200).nullable().optional(),
  profileAssessedAt: dateSchema,
  mobilityProvenance: dataProvenanceSchema.optional(),
  enduranceProvenance: dataProvenanceSchema.optional(),
  strengthProvenance: dataProvenanceSchema.optional(),
  recoveryProvenance: dataProvenanceSchema.optional(),
  typicalLoadProvenance: dataProvenanceSchema.optional(),
});

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
}).extend(soldierProfileFieldsSchema.shape);

export const soldierCsvRowSchema = z.object({
  soldierCode: z.string().min(1),
  role: z.string().min(1),
  experienceYears: z.coerce.number().int().min(0).max(40),
  baselineMobility: z.coerce.number().int().min(0).max(100),
  baselineEndurance: z.coerce.number().int().min(0).max(100),
  baselineStrength: z.coerce.number().int().min(0).max(100),
  baselineRecovery: z.coerce.number().int().min(0).max(100),
  typicalLoadKg: z.coerce.number().min(0).max(50),
  displayName: z.string().trim().min(1).max(80).optional(),
  ageYears: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(18).max(75).optional()),
  heightCm: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(120).max(230).optional()),
  weightKg: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(35).max(250).optional()),
  fitnessAssessment: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().max(1000).optional()),
  assessmentDate: z.preprocess((value) => value === "" ? undefined : value, z.string().date().optional()),
  assessmentSource: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().max(200).optional()),
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

export const missionInputsSchema = missionScenarioSchema.omit({ name: true, description: true, soldierId: true, sourceOperationId: true });

export const operationDocumentConfirmationSchema = z.object({
  title: z.string().trim().min(1).max(160),
  region: z.string().trim().min(1).max(160),
  terrainType: terrainSchema,
  altitudeBand: z.string().trim().min(1).max(100),
  temperatureBand: z.string().trim().min(1).max(100),
  durationMinutes: z.number().int().min(1).max(24 * 60 * 30),
  timeOfDay: timeOfDaySchema,
  weatherSummary: z.string().trim().min(1).max(2000),
  personnelSummary: z.string().trim().min(1).max(2000),
  environmentalFactors: z.string().trim().min(1).max(4000),
  humanFactors: z.string().trim().min(1).max(4000),
  reviewedText: z.string().trim().min(20).max(1_000_000),
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
