import type { MissionInputs, PerformancePoint, SoldierBaseline } from "@/lib/simulation/types";
import { normalizeFactors, strengthAvailabilityAt } from "@/lib/simulation";

export const READINESS_METHODOLOGY_VERSION = "descriptive-readiness-v1";

export type ProvenanceState = "KNOWN" | "UNKNOWN" | "SYNTHETIC" | "MISSING";
export type IndividualAssessmentInput = {
  inputs: MissionInputs;
  baseline: SoldierBaseline;
  snapshots: PerformancePoint[];
  modelVersion: string;
  provenance: Partial<Record<keyof SoldierBaseline, ProvenanceState>>;
};

export function assessIndividual(input: IndividualAssessmentInput) {
  const final = input.snapshots.at(-1) ?? null;
  const capabilityKeys: Array<keyof SoldierBaseline> = ["baselineMobility", "baselineEndurance", "baselineStrength", "baselineRecovery", "typicalLoadKg"];
  const provenanceCounts = { known: 0, unknown: 0, synthetic: 0, missing: 0 };
  for (const key of capabilityKeys) {
    const state = input.provenance[key] ?? "UNKNOWN";
    if (state === "KNOWN") provenanceCounts.known++;
    else if (state === "SYNTHETIC") provenanceCounts.synthetic++;
    else if (state === "MISSING") provenanceCounts.missing++;
    else provenanceCounts.unknown++;
  }
  const initialFatigue = input.snapshots[0]?.fatigue ?? null;
  const peakFatigue = input.snapshots.length ? Math.max(...input.snapshots.map((point) => point.fatigue)) : null;
  const strengthAvailability = final ? strengthAvailabilityAt(normalizeFactors(input.inputs), input.baseline, final.fatigue) : null;
  const normalizedMissionFactors = normalizeFactors(input.inputs);
  const indicatorChanges = final ? [
    { label: "Mobility", baseline: input.baseline.baselineMobility, modeled: final.mobility },
    { label: "Endurance", baseline: input.baseline.baselineEndurance, modeled: final.endurance },
    ...(strengthAvailability === null ? [] : [{ label: "Strength availability", baseline: input.baseline.baselineStrength, modeled: strengthAvailability }]),
  ].map((item) => ({ ...item, delta: round1(item.modeled - item.baseline) })) : [];
  const strengths = indicatorChanges.filter((item) => item.delta >= 0).map((item) => `${item.label} modeled index ends at ${item.modeled.toFixed(1)} versus a stored baseline of ${item.baseline}.`);
  const limitations = indicatorChanges.filter((item) => item.delta < 0).map((item) => `${item.label} modeled index changes by ${item.delta.toFixed(1)} points from its stored baseline under these inputs.`);
  const missing = capabilityKeys.filter((key) => (input.provenance[key] ?? "UNKNOWN") !== "KNOWN").map((key) => `${key}: ${input.provenance[key] ?? "UNKNOWN"}`);
  const explanations = [
    `Uses ${input.modelVersion} and the supplied mission and baseline snapshot.`,
    final && initialFatigue !== null && peakFatigue !== null ? `Modeled fatigue begins at ${initialFatigue.toFixed(1)}, peaks at ${peakFatigue.toFixed(1)}, and ends at ${final.fatigue.toFixed(1)}.` : "No performance timeline is available for this assessment.",
    `Mission inputs include ${input.inputs.terrainType.replaceAll("_", " ")} terrain, ${input.inputs.altitudeMeters} m altitude, ${input.inputs.temperatureCelsius} °C, ${input.inputs.loadKg} kg load, ${input.inputs.durationMinutes} minutes, ${input.inputs.restMinutes} minutes rest, and ${input.inputs.timeOfDay.toLowerCase()} conditions.`,
  ];
  return { methodologyVersion: READINESS_METHODOLOGY_VERSION, final, strengthAvailability, peakFatigue, indicatorChanges, recoveryBaseline: input.baseline.baselineRecovery, normalizedMissionFactors, provenanceCounts, dataCompletenessPercent: Math.round((provenanceCounts.known / capabilityKeys.length) * 100), strengths, limitations, missing, explanations, isPhysiologicalValidation: false, classification: null as null };
}

export type GroupAssessmentMember = {
  soldierCode: string;
  roleName: string | null;
  included: boolean;
  profileQuality: "COMPLETE" | "PROVENANCE_UNKNOWN" | "SYNTHETIC_DEMO" | "INCOMPLETE";
  baseline: SoldierBaseline | null;
  final: Pick<PerformancePoint, "fatigue" | "mobility" | "endurance" | "performance"> | null;
};

export function assessGroup(members: GroupAssessmentMember[], inputs?: MissionInputs) {
  const roleMap = new Map<string, GroupAssessmentMember[]>();
  for (const member of members) {
    const roleName = member.roleName?.trim() || "Unknown / unassigned";
    roleMap.set(roleName, [...(roleMap.get(roleName) ?? []), member]);
  }
  const roles = [...roleMap.entries()].map(([roleName, rows]) => {
    const included = rows.filter((member) => member.included && member.baseline && member.final);
    const average = (values: number[]) => values.length ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    return {
      roleName,
      memberCount: rows.length,
      includedCount: included.length,
      unknownOrLegacyRole: roleName === "Unknown / unassigned",
      provenanceUnknownCount: rows.filter((member) => member.profileQuality === "PROVENANCE_UNKNOWN").length,
      syntheticCount: rows.filter((member) => member.profileQuality === "SYNTHETIC_DEMO").length,
      baselineCapabilities: {
        mobility: average(included.map((member) => member.baseline!.baselineMobility)),
        endurance: average(included.map((member) => member.baseline!.baselineEndurance)),
        strength: average(included.map((member) => member.baseline!.baselineStrength)),
        recovery: average(included.map((member) => member.baseline!.baselineRecovery)),
      },
      modeledOutcomes: {
        performance: range(included.map((member) => member.final!.performance)),
        fatigue: range(included.map((member) => member.final!.fatigue)),
        mobility: range(included.map((member) => member.final!.mobility)),
        endurance: range(included.map((member) => member.final!.endurance)),
      },
    };
  }).sort((a, b) => a.roleName.localeCompare(b.roleName));
  const included = members.filter((member) => member.included && member.final);
  const outputDistribution = {
    performance: range(included.map((member) => member.final!.performance)),
    fatigue: range(included.map((member) => member.final!.fatigue)),
    mobility: range(included.map((member) => member.final!.mobility)),
    endurance: range(included.map((member) => member.final!.endurance)),
  };
  const qualityCounts = {
    complete: members.filter((member) => member.profileQuality === "COMPLETE").length,
    provenanceUnknown: members.filter((member) => member.profileQuality === "PROVENANCE_UNKNOWN").length,
    syntheticDemo: members.filter((member) => member.profileQuality === "SYNTHETIC_DEMO").length,
    incomplete: members.filter((member) => member.profileQuality === "INCOMPLETE").length,
    excluded: members.filter((member) => !member.included).length,
  };
  const unknownRoleCount = roleMap.get("Unknown / unassigned")?.length ?? 0;
  const explanations = [
    `${members.length} roster member snapshots were assessed; ${included.length} have modeled outputs and ${qualityCounts.excluded} were excluded from output distributions.`,
    ...Object.entries(outputDistribution).map(([name, stats]) => `${name} output spans ${stats.minimum ?? "—"} to ${stats.maximum ?? "—"} (mean ${stats.mean ?? "—"}, median ${stats.median ?? "—"}).`),
    `${roles.length} role labels are represented, including ${unknownRoleCount} member(s) with no reliable role snapshot.`,
    `${qualityCounts.provenanceUnknown} member(s) have unknown baseline provenance and ${qualityCounts.syntheticDemo} are marked synthetic demo data.`,
    "No role-specific capability requirements are configured; role distribution is descriptive and cannot determine role impact or operational effectiveness.",
  ];
  return { methodologyVersion: READINESS_METHODOLOGY_VERSION, members: members.length, includedCount: included.length, roleCount: roles.length, roles, outputDistribution, qualityCounts, unknownRoleCount, normalizedMissionFactors: inputs ? normalizeFactors(inputs) : null, strengths: included.length ? [`Group output includes ${included.length} member(s) with saved modeled results.`] : [], limitations: ["Descriptive analysis only; not a validated readiness classification or deployment recommendation.", ...(unknownRoleCount ? [`${unknownRoleCount} role assignment(s) are unknown or absent.`] : []), ...(qualityCounts.provenanceUnknown ? [`${qualityCounts.provenanceUnknown} profile(s) have unknown capability provenance.`] : []), ...(qualityCounts.syntheticDemo ? [`${qualityCounts.syntheticDemo} profile(s) are synthetic demo data.`] : []), ...(qualityCounts.incomplete ? [`${qualityCounts.incomplete} profile(s) lack required simulation inputs.`] : [])], explanations, roleRequirementsKnown: false as const };
}

function range(values: number[]) {
  if (!values.length) return { mean: null, median: null, minimum: null, maximum: null, count: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return { mean: round1(sorted.reduce((sum, value) => sum + value, 0) / sorted.length), median: round1(median), minimum: round1(sorted[0]!), maximum: round1(sorted.at(-1)!), count: sorted.length };
}

function round1(value: number) { return Math.round(value * 10) / 10; }
