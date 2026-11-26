import { runSimulation, SIMULATION_MODEL_VERSION } from "./simulation";
import type { MissionInputs, PerformancePoint, SoldierBaseline } from "./types";

export type GroupMemberInput = {
  id: string;
  soldierCode: string;
  roleName?: string | null;
  status: string;
  baseline: SoldierBaseline | null;
  provenanceComplete: boolean;
  synthetic?: boolean;
};

export type GroupMemberResult = {
  id: string;
  soldierCode: string;
  roleName: string;
  included: boolean;
  exclusionReason: string | null;
  profileQuality: "COMPLETE" | "PROVENANCE_UNKNOWN" | "SYNTHETIC_DEMO" | "INCOMPLETE";
  baseline: SoldierBaseline | null;
  final: PerformancePoint | null;
  timeline: PerformancePoint[];
};

export function simulateRoster(inputs: MissionInputs, roster: GroupMemberInput[]) {
  const members: GroupMemberResult[] = roster.map((member) => {
    if (member.status !== "ACTIVE") return {
      id: member.id, soldierCode: member.soldierCode, included: false,
      roleName: member.roleName?.trim() || "Unknown / unassigned",
      exclusionReason: `Status is ${member.status}`, profileQuality: "INCOMPLETE", baseline: member.baseline, final: null, timeline: [],
    };
    if (!member.baseline) return {
      id: member.id, soldierCode: member.soldierCode, included: false,
      roleName: member.roleName?.trim() || "Unknown / unassigned",
      exclusionReason: "Required simulation baseline is missing", profileQuality: "INCOMPLETE", baseline: null, final: null, timeline: [],
    };
    const result = runSimulation(inputs, member.baseline);
    return {
      id: member.id, soldierCode: member.soldierCode, included: true,
      roleName: member.roleName?.trim() || "Unknown / unassigned",
      exclusionReason: null, profileQuality: member.synthetic ? "SYNTHETIC_DEMO" : member.provenanceComplete ? "COMPLETE" : "PROVENANCE_UNKNOWN",
      baseline: result.baselineUsed, final: result.final, timeline: result.snapshots,
    };
  });
  const included = members.filter((member) => member.included);
  const metrics = ["fatigue", "mobility", "endurance", "performance"] as const;
  const aggregate = Object.fromEntries(metrics.map((metric) => {
    const values = included.map((member) => member.final![metric]).sort((a, b) => a - b);
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const middle = Math.floor(values.length / 2);
    const median = values.length ? values.length % 2 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2 : null;
    const distribution = values.map((value, index) => ({ soldierCode: included.slice().sort((a,b) => a.final![metric] - b.final![metric])[index]!.soldierCode, value }));
    return [metric, { mean: mean === null ? null : round1(mean), median: median === null ? null : round1(median), minimum: values[0] ?? null, maximum: values.at(-1) ?? null, distribution }];
  }));
  const step = included[0]?.timeline.length ?? 0;
  const timeline: PerformancePoint[] = Array.from({ length: step }, (_, index) => {
    const points = included.map((member) => member.timeline[index]!);
    const mean = (key: keyof PerformancePoint) => round1(points.reduce((sum, point) => sum + point[key], 0) / points.length);
    return { timeMinutes: points[0]!.timeMinutes, fatigue: mean("fatigue"), mobility: mean("mobility"), endurance: mean("endurance"), performance: mean("performance") };
  });
  return { modelVersion: SIMULATION_MODEL_VERSION, members, aggregate, timeline, includedCount: included.length, excludedCount: members.length - included.length, incompleteCount: members.filter((member) => member.profileQuality === "INCOMPLETE" || member.profileQuality === "PROVENANCE_UNKNOWN").length, syntheticCount: members.filter((member) => member.profileQuality === "SYNTHETIC_DEMO").length };
}

function round1(value: number) { return Math.round(value * 10) / 10; }
