import {
  operationAnalysisResultSchema,
  type OperationAnalysisResult,
} from "@/lib/validation/schemas";
import { z } from "zod";

const HF_ROUTER_BASE_URL = "https://router.huggingface.co/v1";

export interface AiServiceConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
  isConfigured: boolean;
}

/**
 * Checks if Hugging Face API key and Model are present in environment.
 */
export function isAiConfigured(): boolean {
  const apiKey = process.env.HF_API_KEY;
  const model = process.env.HF_MODEL;
  return Boolean(apiKey && apiKey.trim() && model && model.trim());
}

/**
 * Returns centralized Hugging Face AI configuration.
 */
export function getAiConfig(): AiServiceConfig {
  const apiKey = process.env.HF_API_KEY || "";
  const model = process.env.HF_MODEL || "";
  const enabledFlag = process.env.NEXT_PUBLIC_ENABLE_AI !== "false";
  const configured = isAiConfigured();

  return {
    apiKey,
    model,
    enabled: enabledFlag && configured,
    isConfigured: configured,
  };
}

const SYSTEM_PROMPT = `You extract structured operational learning from training/mission reports.
Return ONLY valid JSON matching the schema. Do not invent real military facts.
Do not claim medical or verified historical authority. Use only information present in the report.
Terrain must be one of: FLAT, ROLLING, MOUNTAIN, STEEP_MOUNTAIN, MIXED, DESERT, FOREST.
timeOfDay should be DAY or NIGHT when possible.`;

/**
 * Analyze operation report via Hugging Face Inference API router endpoint, with deterministic fallback.
 */
export async function analyzeOperationReport(
  rawText: string
): Promise<{ result: OperationAnalysisResult; mode: "ai" | "demo" }> {
  const cfg = getAiConfig();
  if (!cfg.enabled) {
    return { result: fallbackExtract(rawText), mode: "demo" };
  }

  try {
    const first = await callAi(rawText);
    const parsed = operationAnalysisResultSchema.safeParse(first);
    if (parsed.success) return { result: normalizeResult(parsed.data), mode: "ai" };

    const second = await callAi(rawText, true);
    const parsed2 = operationAnalysisResultSchema.safeParse(second);
    if (parsed2.success) return { result: normalizeResult(parsed2.data), mode: "ai" };
  } catch (err) {
    console.error("Hugging Face AI analysis failed, falling back to demo mode:", err);
  }

  return { result: fallbackExtract(rawText), mode: "demo" };
}

/** Structured extraction for the human review queue. Missing source facts remain null. */
export async function extractHistoricalIntelligence(rawText: string): Promise<{
  result: HistoricalIntelligenceResult;
  mode: "ai" | "fallback";
}> {
  const cfg = getAiConfig();
  if (!cfg.enabled) return { result: fallbackHistoricalExtraction(rawText), mode: "fallback" };
  try {
    const value = await callHistoricalAi(rawText);
    const parsed = historicalIntelligenceSchema.safeParse(value);
    if (parsed.success) return { result: normalizeHistorical(parsed.data, rawText), mode: "ai" };
  } catch {
    // Do not log report content, credentials, or provider response bodies.
  }
  return { result: fallbackHistoricalExtraction(rawText), mode: "fallback" };
}

const claimSchema = z.object({
  text: z.string().min(1).max(1000),
  sourcePassage: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1).nullable(),
  explicitlyDocumented: z.boolean(),
});

const historicalIntelligenceSchema = z.object({
  title: z.string().nullable(),
  dateOrDateRange: z.string().nullable(),
  location: z.string().nullable(),
  terrain: z.enum(["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"]).nullable(),
  altitude: z.string().nullable(),
  temperature: z.string().nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  timeOfDay: z.enum(["DAY", "NIGHT"]).nullable(),
  environmentalChallenges: z.array(claimSchema),
  humanPerformance: z.array(claimSchema),
  fatigueWorkload: z.array(claimSchema),
  logisticsEquipment: z.array(claimSchema),
  recovery: z.array(claimSchema),
  outcomes: z.array(claimSchema),
  lessons: z.array(claimSchema.extend({ category: z.string().nullable() })),
});

export type HistoricalIntelligenceResult = z.infer<typeof historicalIntelligenceSchema>;

async function callHistoricalAi(rawText: string): Promise<unknown> {
  const cfg = getAiConfig();
  const response = await fetch(`${HF_ROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Extract historical facts from training and after-action reports. Return strict JSON with title, dateOrDateRange, location, terrain, altitude, temperature, durationMinutes, timeOfDay, and arrays environmentalChallenges, humanPerformance, fatigueWorkload, logisticsEquipment, recovery, outcomes, lessons. Every array item has text, sourcePassage copied verbatim from the report, confidence 0..1 or null, explicitlyDocumented boolean; lessons also has category or null. Use null for unavailable scalar values and [] for absent observations. Never infer numbers, never create advice, never invent facts. Keep each claim short. Return JSON only." },
        { role: "user", content: rawText.slice(0, 24_000) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Hugging Face request failed (${response.status})`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty model response");
  return JSON.parse(content);
}

function normalizeHistorical(value: HistoricalIntelligenceResult, rawText: string): HistoricalIntelligenceResult {
  const normalizeClaims = <T extends { sourcePassage: string }>(items: T[]) => items.filter((item) => {
    const passage = item.sourcePassage.trim();
    return passage.length > 0 && rawText.toLocaleLowerCase().includes(passage.toLocaleLowerCase());
  });
  return {
    ...value,
    title: value.title?.trim() || null,
    dateOrDateRange: value.dateOrDateRange?.trim() || null,
    location: value.location?.trim() || null,
    altitude: value.altitude?.trim() || null,
    temperature: value.temperature?.trim() || null,
    environmentalChallenges: normalizeClaims(value.environmentalChallenges),
    humanPerformance: normalizeClaims(value.humanPerformance),
    fatigueWorkload: normalizeClaims(value.fatigueWorkload),
    logisticsEquipment: normalizeClaims(value.logisticsEquipment),
    recovery: normalizeClaims(value.recovery),
    outcomes: normalizeClaims(value.outcomes),
    lessons: normalizeClaims(value.lessons),
  };
}

export function fallbackHistoricalExtraction(rawText: string): HistoricalIntelligenceResult {
  const lines = rawText.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const field = (name: string) => lines.find((line) => new RegExp(`^${name}\\s*[:：-]`, "i").test(line))?.split(/[:：-]/).slice(1).join(":").trim() || null;
  const category = (patterns: RegExp) => lines.filter((line) => patterns.test(line)).map((text) => ({ text, sourcePassage: text, confidence: null, explicitlyDocumented: true }));
  const duration = field("duration")?.match(/(\d+(?:\.\d+)?)\s*(h|hours?|m|min(?:utes?)?)/i);
  const durationMinutes = duration ? Math.round(Number(duration[1]) * (/^h/i.test(duration[2]!) ? 60 : 1)) : null;
  const terrainLine = field("terrain")?.toUpperCase().replace(/\s+/g, "_");
  const terrains = ["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"];
  return {
    title: field("operation") ?? field("title") ?? field("exercise"),
    dateOrDateRange: field("date") ?? null,
    location: field("location") ?? field("region"),
    terrain: terrains.includes(terrainLine ?? "") ? terrainLine as HistoricalIntelligenceResult["terrain"] : null,
    altitude: field("altitude"),
    temperature: field("temperature") ?? field("temp"),
    durationMinutes,
    timeOfDay: /night/i.test(rawText) ? "NIGHT" : /day/i.test(rawText) ? "DAY" : null,
    environmentalChallenges: category(/weather|terrain|environment|cold|heat|altitude/i),
    humanPerformance: category(/performance|mobility|pace|movement|human factor/i),
    fatigueWorkload: category(/fatigue|workload|load|exhaust/i),
    logisticsEquipment: category(/logistic|equipment|supply|gear/i),
    recovery: category(/recovery|rest|sleep/i),
    outcomes: category(/outcome|result|completed|injury|success|failure/i),
    lessons: category(/lesson|recommendation|should have|learned/i).map((item) => ({ ...item, category: "DOCUMENTED" })),
  };
}

async function callAi(rawText: string, stricter = false): Promise<unknown> {
  const cfg = getAiConfig();
  if (!cfg.apiKey || !cfg.model) {
    throw new Error("Hugging Face AI configuration is incomplete.");
  }

  const response = await fetch(`${HF_ROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `${stricter ? "Previous output was invalid. Return strict JSON only.\n\n" : ""}Extract structured fields from this report:\n\n${rawText.slice(0, 12000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Hugging Face Router HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Hugging Face AI model");
  return JSON.parse(content);
}

function normalizeResult(r: OperationAnalysisResult): OperationAnalysisResult {
  const terrain = String(r.terrain).toUpperCase().replace(/\s+/g, "_");
  const valid = ["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED", "DESERT", "FOREST"];
  return {
    ...r,
    terrain: valid.includes(terrain) ? terrain : "Not documented",
    timeOfDay: /night/i.test(String(r.timeOfDay)) ? "NIGHT" : /day/i.test(String(r.timeOfDay)) ? "DAY" : "Not documented",
    environmentalFactors: Array.isArray(r.environmentalFactors)
      ? r.environmentalFactors.join("; ")
      : r.environmentalFactors,
    observedHumanFactors: Array.isArray(r.observedHumanFactors)
      ? r.observedHumanFactors.join("; ")
      : r.observedHumanFactors,
  };
}

/** Deterministic pattern-based extractor for demo / offline mode */
export function fallbackExtract(rawText: string): OperationAnalysisResult {
  const text = rawText;
  const pick = (re: RegExp, fallback: string) => {
    const m = text.match(re);
    return m?.[1]?.trim() || fallback;
  };

  const terrainRaw = pick(/terrain\s*[:\-]\s*([^\n]+)/i, pick(/steep mountain|mountain|rolling|flat|mixed|desert|forest/i, "Not documented"));
  let terrain = "Not documented";
  const t = terrainRaw.toUpperCase();
  if (t.includes("STEEP")) terrain = "STEEP_MOUNTAIN";
  else if (t.includes("ROLL")) terrain = "ROLLING";
  else if (t.includes("FLAT")) terrain = "FLAT";
  else if (t.includes("MIX")) terrain = "MIXED";
  else if (t.includes("DESERT")) terrain = "DESERT";
  else if (t.includes("FOREST")) terrain = "FOREST";
  else if (t.includes("MOUNT")) terrain = "MOUNTAIN";

  const durationStr = pick(/duration\s*[:\-]\s*([^\n]+)/i, pick(/(\d+(?:\.\d+)?\s*h(?:ours?)?)/i, "Not documented"));
  const timeOfDay = /night/i.test(text) ? "NIGHT" : /\bday(?:time)?\b/i.test(text) ? "DAY" : "Not documented";
  const title = pick(
    /(?:operation|title|mission)\s*[:\-]\s*([^\n]+)/i,
    "Unreviewed pasted report"
  );
  const region = pick(/(?:region|location)\s*[:\-]\s*([^\n]+)/i, "Not documented");
  const altitudeBand = pick(
    /altitude\s*[:\-]\s*([^\n]+)/i,
    pick(/(\d{3,4}\s*m)/i, "Not documented")
  );
  const temperatureBand = pick(
    /temp(?:erature)?\s*[:\-]\s*([^\n]+)/i,
    pick(/cold|freezing|-?\d+\s*°?c/i, "Not documented")
  );
  const weather = pick(/weather\s*[:\-]\s*([^\n]+)/i, "Not documented");

  const lines = text
    .split(/\n/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter((l) => l.length > 20 && l.length < 200);

  const keyObservations = lines.slice(0, 4);
  const lessons = lines.filter((line) => /\b(lesson|learned|recommendation|recommend|should have)\b/i.test(line)).map((line) => ({ title: line.slice(0, 120), description: line, category: "UNREVIEWED SOURCE TEXT" }));

  return {
    title,
    region,
    terrain,
    altitudeBand,
    temperatureBand,
    duration: durationStr,
    timeOfDay,
    weather,
    personnelSummary: pick(/personnel\s*[:\-]\s*([^\n]+)/i, "Not documented"),
    environmentalFactors: [
      `Terrain: ${terrain}`,
      `Altitude: ${altitudeBand}`,
      `Temperature: ${temperatureBand}`,
    ].join("; "),
    observedHumanFactors: pick(
      /human factors?\s*[:\-]\s*([^\n]+)/i,
      "Not documented"
    ),
    keyObservations,
    lessons,
    tags: ["demo-extraction", terrain.toLowerCase(), timeOfDay.toLowerCase()],
  };
}
