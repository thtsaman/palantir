import { OpenAI } from "openai";
import {
  operationAnalysisResultSchema,
  type OperationAnalysisResult,
} from "@/lib/validation/schemas";

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

/**
 * Gets a server-side OpenAI-compatible client pre-configured for Hugging Face router endpoint.
 */
export function getAiClient(): OpenAI | null {
  const cfg = getAiConfig();
  if (!cfg.enabled) {
    return null;
  }

  return new OpenAI({
    baseURL: HF_ROUTER_BASE_URL,
    apiKey: cfg.apiKey,
  });
}

const SYSTEM_PROMPT = `You extract structured operational learning from training/mission reports.
Return ONLY valid JSON matching the schema. Do not invent real military facts.
Do not claim medical or verified historical authority. Use only information present in the report.
Terrain must be one of: FLAT, ROLLING, MOUNTAIN, STEEP_MOUNTAIN, MIXED.
timeOfDay should be DAY or NIGHT when possible.`;

/**
 * Analyze operation report via Hugging Face Inference API router, with deterministic fallback.
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

async function callAi(rawText: string, stricter = false): Promise<unknown> {
  const client = getAiClient();
  const cfg = getAiConfig();
  if (!client || !cfg.model) {
    throw new Error("Hugging Face AI configuration is incomplete.");
  }

  const response = await client.chat.completions.create({
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
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Hugging Face AI model");
  return JSON.parse(content);
}

function normalizeResult(r: OperationAnalysisResult): OperationAnalysisResult {
  const terrain = String(r.terrain).toUpperCase().replace(/\s+/g, "_");
  const valid = ["FLAT", "ROLLING", "MOUNTAIN", "STEEP_MOUNTAIN", "MIXED"];
  return {
    ...r,
    terrain: valid.includes(terrain) ? terrain : "MOUNTAIN",
    timeOfDay: /night/i.test(String(r.timeOfDay)) ? "NIGHT" : "DAY",
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

  const terrainRaw = pick(
    /terrain\s*[:\-]\s*([^\n]+)/i,
    pick(/mountain|steep|rolling|flat|mixed/i, "Mountain")
  );
  let terrain = "MOUNTAIN";
  const t = terrainRaw.toUpperCase();
  if (t.includes("STEEP")) terrain = "STEEP_MOUNTAIN";
  else if (t.includes("ROLL")) terrain = "ROLLING";
  else if (t.includes("FLAT")) terrain = "FLAT";
  else if (t.includes("MIX")) terrain = "MIXED";
  else if (t.includes("MOUNT")) terrain = "MOUNTAIN";

  const durationStr = pick(
    /duration\s*[:\-]\s*([^\n]+)/i,
    pick(/(\d+\s*h(?:ours?)?)/i, "8 hours")
  );
  const timeOfDay = /night/i.test(text) ? "NIGHT" : "DAY";
  const title = pick(
    /(?:operation|title|mission)\s*[:\-]\s*([^\n]+)/i,
    "Structured Operation Summary"
  );
  const region = pick(/region\s*[:\-]\s*([^\n]+)/i, "Unspecified region");
  const altitudeBand = pick(
    /altitude\s*[:\-]\s*([^\n]+)/i,
    pick(/(\d{3,4}\s*m)/i, "3000-4000m")
  );
  const temperatureBand = pick(
    /temp(?:erature)?\s*[:\-]\s*([^\n]+)/i,
    pick(/cold|freezing|-?\d+\s*°?c/i, "Cold")
  );
  const weather = pick(/weather\s*[:\-]\s*([^\n]+)/i, "Reported conditions from source text");

  const lines = text
    .split(/\n/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter((l) => l.length > 20 && l.length < 200);

  const keyObservations =
    lines.slice(0, 4).length >= 2
      ? lines.slice(0, 4)
      : [
          "Workload and movement demand noted in source report.",
          "Environmental conditions influenced pacing and recovery.",
          "Duration and rest patterns appear material to outcomes described.",
        ];

  const lessons = [
    {
      title: "Match load to duration",
      description:
        "Source text suggests load management matters under extended environmental stress.",
      category: "LOAD",
    },
    {
      title: "Plan recovery windows",
      description:
        "Rest intervals should be explicit when duration and terrain demand are high.",
      category: "RECOVERY",
    },
    {
      title: "Reuse comparable conditions",
      description:
        "Similar altitude, terrain, and temperature bands can seed future simulations.",
      category: "PLANNING",
    },
  ];

  return {
    title,
    region,
    terrain,
    altitudeBand,
    temperatureBand,
    duration: durationStr,
    timeOfDay,
    weather,
    personnelSummary: pick(
      /personnel\s*[:\-]\s*([^\n]+)/i,
      "Team composition as described in source report"
    ),
    environmentalFactors: [
      `Terrain: ${terrain}`,
      `Altitude: ${altitudeBand}`,
      `Temperature: ${temperatureBand}`,
    ].join("; "),
    observedHumanFactors: pick(
      /human factors?\s*[:\-]\s*([^\n]+)/i,
      "Workload, movement demand, duration, recovery conditions"
    ),
    keyObservations,
    lessons,
    tags: ["demo-extraction", terrain.toLowerCase(), timeOfDay.toLowerCase()],
  };
}
