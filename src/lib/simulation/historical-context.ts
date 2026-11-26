import type { TerrainType, TimeOfDay } from "@prisma/client";

export const HISTORICAL_SIMILARITY_VERSION = "historical-evidence-v1";
export const HISTORICAL_COMPARISON_WEIGHTS = {
  terrain: 0.25,
  altitude: 0.2,
  temperature: 0.15,
  duration: 0.15,
  timeOfDay: 0.1,
  carriedLoad: 0.15,
} as const;
const TOLERANCE = { altitude: 1500, temperature: 15, duration: 240, carriedLoad: 15 };
const MIN_COMPARABLE_ATTRIBUTES = 2;

export type HistoricalScenarioInputs = {
  terrainType: TerrainType | null;
  altitudeMeters: number | null;
  temperatureCelsius: number | null;
  durationMinutes: number | null;
  timeOfDay: TimeOfDay | null;
  loadKg: number | null;
};

export type HistoricalCandidate = {
  id: string; title: string; region: string; terrainType: TerrainType; altitudeBand: string;
  temperatureBand: string; durationMinutes: number; timeOfDay: TimeOfDay; rawReport: string | null;
  extractionJson: unknown; createdAt: Date; operationDate?: Date | null; missionCategory?: string | null;
  adversaryContext?: string | null; isDemo?: boolean;
  lessons: Array<{ id: string; title: string; description: string; category: string; sourcePassage: string | null; extractionMode: string; editedDuringReview: boolean }>;
  sourceDocument: { id: string; originalFilename: string; fileType: string | null; uploadedAt: Date } | null;
};

export function parseDocumentedNumber(value: string | null | undefined, kind: "altitude" | "temperature"): number | null {
  if (!value || /unknown|not stated|not recorded|unspecified|n\/a|^—$|^-$|not available/i.test(value)) return null;
  const normalized = value.replace(/,/g, "");
  const range = normalized.match(/(-?\d+(?:\.\d+)?)\s*(?:\bto\b|–|—|-)\s*(-?\d+(?:\.\d+)?)/i);
  const single = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!single) return null;
  const number = range ? (Number(range[1]) + Number(range[2])) / 2 : Number(single[0]);
  if (kind === "altitude" && !/m(?:eters?)?\b/i.test(value)) return null;
  if (kind === "temperature" && !/(?:°\s*c|\bcelsius\b|\bC\b)/i.test(value)) return null;
  return number;
}

function documentedLoad(report: string | null): number | null {
  if (!report) return null;
  const match = report.match(/\b(?:carried\s+)?load\s*[:=\-]\s*(\d+(?:\.\d+)?)\s*kg\b/i);
  return match?.[1] ? Number(match[1]) : null;
}

function extractionScalar(extraction: unknown, key: string): unknown {
  if (!extraction || typeof extraction !== "object") return undefined;
  return (extraction as Record<string, unknown>)[key];
}

function similarity(valueA: number, valueB: number, tolerance: number) {
  return Math.max(0, 1 - Math.min(1, Math.abs(valueA - valueB) / tolerance));
}

export function compareHistoricalScenario(inputs: HistoricalScenarioInputs, candidates: HistoricalCandidate[], limit = 5) {
  const comparisons = candidates.map((record) => {
    const historicalExtraction = record.extractionJson;
    const documentedTerrain = extractionScalar(historicalExtraction, "terrain");
    const documentedTime = extractionScalar(historicalExtraction, "timeOfDay");
    const terrain = historicalExtraction && documentedTerrain === null ? null : record.terrainType;
    const time = historicalExtraction && documentedTime === null ? null : record.timeOfDay;
    const altitude = parseDocumentedNumber(record.altitudeBand, "altitude");
    const temperature = parseDocumentedNumber(record.temperatureBand, "temperature");
    const load = documentedLoad(record.rawReport);
    const attrs: Array<{ key: keyof typeof HISTORICAL_COMPARISON_WEIGHTS; label: string; weight: number; score: number; current: string; historical: string }> = [];
    if (terrain && inputs.terrainType) attrs.push({ key: "terrain", label: "Terrain", weight: HISTORICAL_COMPARISON_WEIGHTS.terrain, score: inputs.terrainType === terrain ? 1 : 0, current: inputs.terrainType.replaceAll("_", " "), historical: terrain.replaceAll("_", " ") });
    if (altitude !== null && inputs.altitudeMeters !== null) attrs.push({ key: "altitude", label: "Altitude", weight: HISTORICAL_COMPARISON_WEIGHTS.altitude, score: similarity(inputs.altitudeMeters, altitude, TOLERANCE.altitude), current: `${inputs.altitudeMeters} m`, historical: `${altitude} m (from ${record.altitudeBand})` });
    if (temperature !== null && inputs.temperatureCelsius !== null) attrs.push({ key: "temperature", label: "Temperature", weight: HISTORICAL_COMPARISON_WEIGHTS.temperature, score: similarity(inputs.temperatureCelsius, temperature, TOLERANCE.temperature), current: `${inputs.temperatureCelsius} °C`, historical: `${temperature} °C (from ${record.temperatureBand})` });
    if (Number.isFinite(record.durationMinutes) && record.durationMinutes > 0 && inputs.durationMinutes !== null) attrs.push({ key: "duration", label: "Duration", weight: HISTORICAL_COMPARISON_WEIGHTS.duration, score: similarity(inputs.durationMinutes, record.durationMinutes, TOLERANCE.duration), current: `${inputs.durationMinutes} min`, historical: `${record.durationMinutes} min` });
    if (time && inputs.timeOfDay) attrs.push({ key: "timeOfDay", label: "Time of day", weight: HISTORICAL_COMPARISON_WEIGHTS.timeOfDay, score: inputs.timeOfDay === time ? 1 : 0, current: inputs.timeOfDay, historical: time });
    if (load !== null && inputs.loadKg !== null) attrs.push({ key: "carriedLoad", label: "Carried load", weight: HISTORICAL_COMPARISON_WEIGHTS.carriedLoad, score: similarity(inputs.loadKg, load, TOLERANCE.carriedLoad), current: `${inputs.loadKg} kg`, historical: `${load} kg (explicitly documented)` });
    const weightSum = attrs.reduce((sum, attr) => sum + attr.weight, 0);
    const score = weightSum ? attrs.reduce((sum, attr) => sum + attr.score * attr.weight, 0) / weightSum : 0;
    const matchingAttributes = attrs.filter((attr) => attr.score >= 0.7).map(({ key, label, current, historical }) => ({ key, label, scenarioValue: current, historicalValue: historical }));
    const differences = attrs.filter((attr) => attr.score < 0.7).map(({ key, label, current, historical }) => ({ key, label, scenarioValue: current, historicalValue: historical }));
    const missingAttributes = [
      ...(terrain && inputs.terrainType ? [] : ["terrain"]), ...(altitude !== null && inputs.altitudeMeters !== null ? [] : ["altitude"]), ...(temperature !== null && inputs.temperatureCelsius !== null ? [] : ["temperature"]),
      ...(record.durationMinutes > 0 && inputs.durationMinutes !== null ? [] : ["duration"]), ...(time && inputs.timeOfDay ? [] : ["time of day"]), ...(load !== null && inputs.loadKg !== null ? [] : ["carried load"]),
    ];
    const enoughEvidence = attrs.length >= MIN_COMPARABLE_ATTRIBUTES;
    const fieldCompleteness = Math.round((attrs.length / Object.keys(HISTORICAL_COMPARISON_WEIGHTS).length) * 100);
    const reasons = matchingAttributes.length
      ? `Relevant because ${matchingAttributes.map((attr) => attr.label.toLowerCase()).join(", ")} ${matchingAttributes.length === 1 ? "is" : "are"} comparable${missingAttributes.length ? `; ${missingAttributes.join(", ")} ${missingAttributes.length === 1 ? "is" : "are"} unavailable and excluded` : ""}.`
      : `No attributes meet the comparison agreement rule${missingAttributes.length ? `; ${missingAttributes.join(", ")} ${missingAttributes.length === 1 ? "is" : "are"} unavailable and excluded` : ""}.`;
    return {
      id: record.id, title: record.title, region: record.region, recordedAt: record.createdAt.toISOString(),
      operationDate: record.operationDate?.toISOString() ?? null, missionCategory: record.missionCategory ?? null,
      adversaryContext: record.adversaryContext ?? null, isDemo: record.isDemo ?? false,
      terrainType: terrain, altitudeBand: altitude === null ? null : record.altitudeBand,
      temperatureBand: temperature === null ? null : record.temperatureBand, durationMinutes: record.durationMinutes > 0 ? record.durationMinutes : null,
      timeOfDay: time, similarityPercent: Math.round(score * 100), matchingAttributes, differences, missingAttributes,
      comparableAttributeCount: attrs.length, dataCompletenessPercent: fieldCompleteness, sufficientEvidence: enoughEvidence,
      explanation: enoughEvidence ? reasons : `Insufficient comparable evidence: only ${attrs.length} of 6 attributes are documented. At least ${MIN_COMPARABLE_ATTRIBUTES} are required.`,
      lessons: record.lessons, sourceDocument: record.sourceDocument ? { ...record.sourceDocument, uploadedAt: record.sourceDocument.uploadedAt.toISOString() } : null,
      limitations: ["Similarity organizes comparable historical observations; it does not predict mission success or failure.", ...missingAttributes.map((name) => `${name} was unavailable in the historical record and excluded.`)],
    };
  });
  return comparisons.filter((match) => match.sufficientEvidence).sort((a, b) => b.similarityPercent - a.similarityPercent).slice(0, limit);
}

export const HISTORICAL_COMPARISON_METHOD = {
  version: HISTORICAL_SIMILARITY_VERSION,
  weights: HISTORICAL_COMPARISON_WEIGHTS,
  numericTolerances: { altitudeMeters: TOLERANCE.altitude, temperatureCelsius: TOLERANCE.temperature, durationMinutes: TOLERANCE.duration, carriedLoadKg: TOLERANCE.carriedLoad },
  minComparableAttributes: MIN_COMPARABLE_ATTRIBUTES,
  agreementRule: "Numeric values match when within 30% of the documented tolerance; categorical values must be exact.",
};
