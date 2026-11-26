import { parseDocumentedNumber } from "@/lib/simulation/historical-context";

export const HISTORICAL_PATTERN_METHOD = {
  version: "approved-record-patterns-v1",
  minimumDistinctRecords: 2,
  numericalBuckets: { altitudeMeters: 1000, temperatureCelsius: 10, durationMinutes: 120 },
  grouping: "Exact normalized wording/category or fixed documented-unit buckets; no semantic inference or causality.",
} as const;

export type PatternRecord = {
  id: string; title: string; region: string; terrainType: string; altitudeBand: string | null;
  temperatureBand: string | null; durationMinutes: number | null; timeOfDay: string | null;
  weatherSummary: string | null; environmentalFactors: string | null; humanFactors: string | null;
  createdAt: Date; reviewedAt: Date | null; operationDate?: Date | null; missionCategory?: string | null; isDemo?: boolean;
  lessons: Array<{ id: string; title: string; description: string; category: string; sourcePassage: string | null }>;
  sourceDocument: { id: string; originalFilename: string } | null;
};

export type HistoricalPattern = {
  id: string; dimension: string; description: string; grouping: "EXACT_CATEGORY" | "NUMERICAL_BUCKET" | "EXACT_OBSERVATION" | "LESSON_CATEGORY" | "EXACT_LESSON";
  supportCount: number; consistency: "CONSISTENT" | "CONFLICTING"; coveragePercent: number;
  missingInformation: string[]; records: Array<{ id: string; title: string; region: string; date: string | null; terrain: string; missionCategory: string | null; isDemo: boolean; environment: string[]; sourceDocument: { id: string; filename: string } | null; lessons: Array<{ id: string; title: string; description: string; category: string; sourcePassage: string | null }> }>;
};

const clean = (value: string | null | undefined) => (value ?? "").trim().replace(/\s+/g, " ");
const norm = (value: string | null | undefined) => clean(value).toLocaleLowerCase().replace(/[.,;:!?()[\]{}]/g, "");
const unknown = (value: string | null | undefined) => !clean(value) || /^(unknown|not stated|not recorded|unspecified|n\/?a|none|—|-)$/i.test(clean(value));
const splitObservations = (value: string | null) => (value ?? "").split(/[;\n]+/).map(clean).filter((v) => v.length >= 4 && !unknown(v));
const bucket = (value: number, size: number) => Math.floor(value / size) * size;

export function discoverHistoricalPatterns(source: PatternRecord[], minimumRecords = HISTORICAL_PATTERN_METHOD.minimumDistinctRecords): HistoricalPattern[] {
  const records = source.filter((record) => record.id && record.lessons.every((lesson) => lesson.id));
  const groups = new Map<string, { dimension: string; label: string; grouping: HistoricalPattern["grouping"]; records: Map<string, PatternRecord>; conflictKeys: Set<string> }>();
  const add = (key: string, dimension: string, label: string, grouping: HistoricalPattern["grouping"], record: PatternRecord, conflictKey = "") => {
    const id = `${dimension}:${key}`;
    const group = groups.get(id) ?? { dimension, label, grouping, records: new Map<string, PatternRecord>(), conflictKeys: new Set<string>() };
    group.records.set(record.id, record);
    if (conflictKey) group.conflictKeys.add(conflictKey);
    groups.set(id, group);
  };
  for (const record of records) {
    if (record.operationDate) add(String(record.operationDate.getUTCFullYear()), "Event year", `Training or operation records dated ${record.operationDate.getUTCFullYear()}`, "EXACT_CATEGORY", record);
    const terrain = clean(record.terrainType);
    if (!unknown(terrain)) add(norm(terrain), "Terrain", `Terrain documented as ${terrain.replaceAll("_", " ").toLowerCase()}`, "EXACT_CATEGORY", record);
    if (record.timeOfDay && !unknown(record.timeOfDay)) add(norm(record.timeOfDay), "Time of day", `Time of day documented as ${record.timeOfDay.toLowerCase()}`, "EXACT_CATEGORY", record);
    const altitude = parseDocumentedNumber(record.altitudeBand, "altitude");
    if (altitude !== null) { const start = bucket(altitude, HISTORICAL_PATTERN_METHOD.numericalBuckets.altitudeMeters); add(String(start), "Altitude", `Documented altitude midpoint in ${start}–${start + 999} m bucket`, "NUMERICAL_BUCKET", record); }
    const temp = parseDocumentedNumber(record.temperatureBand, "temperature");
    if (temp !== null) { const start = bucket(temp, HISTORICAL_PATTERN_METHOD.numericalBuckets.temperatureCelsius); add(String(start), "Temperature", `Documented temperature midpoint in ${start}–${start + 9} °C bucket`, "NUMERICAL_BUCKET", record); }
    if (record.durationMinutes !== null && record.durationMinutes > 0) { const start = bucket(record.durationMinutes, HISTORICAL_PATTERN_METHOD.numericalBuckets.durationMinutes); add(String(start), "Duration", `Mission duration ${start}–${start + 119} minutes`, "NUMERICAL_BUCKET", record); }
    for (const [field, value] of [["Weather", record.weatherSummary], ["Environmental observation", record.environmentalFactors], ["Human-performance observation", record.humanFactors]] as const) {
      for (const observation of splitObservations(value)) add(norm(observation), field, `${field}: “${observation}”`, "EXACT_OBSERVATION", record);
    }
    for (const lesson of record.lessons) {
      const category = clean(lesson.category);
      if (!unknown(category)) add(norm(category), "Lesson category", `Approved lessons categorized as “${category}”`, "LESSON_CATEGORY", record, norm(lesson.title));
      const wording = norm(`${lesson.title} ${lesson.description}`);
      if (wording.length >= 12) add(wording, "Repeated lesson wording", `Repeated approved lesson wording: “${clean(lesson.title)}”`, "EXACT_LESSON", record);
    }
  }
  return [...groups.entries()].flatMap(([id, group]) => {
    const supporting = [...group.records.values()];
    if (supporting.length < minimumRecords) return [];
    const observations = supporting.flatMap((record) => group.dimension === "Lesson category" ? record.lessons.filter((lesson) => norm(lesson.category) === id.slice(id.indexOf(":") + 1)).map((lesson) => norm(lesson.title)) : group.dimension === "Temperature" ? [norm(record.temperatureBand)] : group.dimension === "Altitude" ? [norm(record.altitudeBand)] : []);
    const conflict = new Set(observations).size > 1;
    const availableFields = supporting.reduce((total, r) => total + [
      !unknown(r.terrainType), parseDocumentedNumber(r.altitudeBand, "altitude") !== null,
      parseDocumentedNumber(r.temperatureBand, "temperature") !== null, r.durationMinutes !== null && r.durationMinutes > 0,
      !unknown(r.timeOfDay), !unknown(r.weatherSummary), !unknown(r.environmentalFactors), !unknown(r.humanFactors),
    ].filter(Boolean).length, 0);
    const result: HistoricalPattern = {
      id, dimension: group.dimension, description: group.label, grouping: group.grouping, supportCount: supporting.length,
      consistency: conflict ? "CONFLICTING" : "CONSISTENT", coveragePercent: Math.round(availableFields / (supporting.length * 8) * 100),
      missingInformation: [...new Set(supporting.flatMap((r) => [!r.operationDate && "event date", !r.sourceDocument && "original source document", unknown(r.terrainType) && "terrain", unknown(r.altitudeBand) && "altitude", unknown(r.temperatureBand) && "temperature", !r.durationMinutes && "duration", unknown(r.timeOfDay) && "time of day", unknown(r.weatherSummary) && "weather", unknown(r.environmentalFactors) && "environmental factors", unknown(r.humanFactors) && "human-performance observations"].filter(Boolean) as string[]))],
      records: supporting.map((r) => ({ id: r.id, title: r.title, region: r.region, date: r.operationDate?.toISOString() ?? null, terrain: clean(r.terrainType), missionCategory: r.missionCategory ?? null, isDemo: r.isDemo ?? false, environment: [clean(r.temperatureBand), clean(r.weatherSummary), clean(r.environmentalFactors)].filter((v) => !unknown(v)), sourceDocument: r.sourceDocument ? { id: r.sourceDocument.id, filename: r.sourceDocument.originalFilename } : null, lessons: r.lessons.map((l) => ({ ...l })) })),
    };
    return [result];
  }).sort((a, b) => b.supportCount - a.supportCount || a.dimension.localeCompare(b.dimension) || a.description.localeCompare(b.description));
}
