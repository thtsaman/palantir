import type { PerformancePoint } from "./types";

/**
 * Aggregate individual performance into role / squad / unit capability.
 * These are simulated relative indices — not combat effectiveness claims.
 */
export function aggregateCapability(
  members: Array<{ performance: number; weight?: number }>
): number {
  if (members.length === 0) return 0;
  let wSum = 0;
  let pSum = 0;
  for (const m of members) {
    const w = m.weight ?? 1;
    wSum += w;
    pSum += m.performance * w;
  }
  return Math.round((pSum / wSum) * 10) / 10;
}

export function roleFromSoldiers(
  soldiers: Array<{ finalPerformance: number }>
): number {
  return aggregateCapability(
    soldiers.map((s) => ({ performance: s.finalPerformance }))
  );
}

export function meanSnapshotMetric(
  snapshots: PerformancePoint[],
  key: keyof Omit<PerformancePoint, "timeMinutes">
): number {
  if (snapshots.length === 0) return 0;
  const sum = snapshots.reduce((acc, s) => acc + (s[key] as number), 0);
  return Math.round((sum / snapshots.length) * 10) / 10;
}
