import { clamp100, normalizeFactors } from "./factors";
import type {
  MissionInputs,
  PerformancePoint,
  SimulationResult,
  SoldierBaseline,
} from "./types";

const DEFAULT_BASELINE: SoldierBaseline = {
  baselineMobility: 85,
  baselineEndurance: 82,
  baselineStrength: 80,
  baselineRecovery: 78,
  experienceYears: 4,
  typicalLoadKg: 18,
};

/**
 * Choose timestep from duration: 15 min for short, 30 min for long missions.
 */
export function chooseTimestep(durationMinutes: number): number {
  return durationMinutes <= 360 ? 15 : 30;
}

/**
 * Deterministic human-performance simulation.
 *
 * Conceptual model:
 *   mission stress + load + altitude + temperature + terrain + duration − recovery
 *   → changing fatigue state → mobility / endurance / performance indices
 *
 * All outputs are PROTOTYPE RELATIVE INDICES (0–100), not clinical measurements.
 */
export function runSimulation(
  inputs: MissionInputs,
  baseline: Partial<SoldierBaseline> = {}
): SimulationResult {
  const b: SoldierBaseline = { ...DEFAULT_BASELINE, ...baseline };
  const factors = normalizeFactors(inputs);
  const step = chooseTimestep(inputs.durationMinutes);
  const total = Math.max(step, inputs.durationMinutes);
  const experienceBuffer = Math.min(0.15, b.experienceYears * 0.015);
  const recoverySkill = clamp100(b.baselineRecovery) / 100;

  const snapshots: PerformancePoint[] = [];
  let fatigue = 8 + factors.environmentStress * 12;

  for (let t = 0; t <= total; t += step) {
    const progress = t / total;

    // Workload accumulates; rest periodically bleeds fatigue
    const workRate =
      factors.loadFactor * 18 +
      factors.terrainFactor * 14 +
      factors.altitudeFactor * 10 +
      factors.temperatureFactor * 8 +
      factors.nightFactor * 6 +
      factors.distanceFactor * 6;

    const restPulse =
      Math.sin((t / Math.max(1, inputs.restMinutes || 15)) * Math.PI) > 0.7
        ? factors.recoveryFactor * recoverySkill * 8
        : factors.recoveryFactor * recoverySkill * 1.5;

    fatigue = clamp100(
      fatigue +
        (workRate * (0.35 + progress * 0.65) * (step / 60)) -
        restPulse * (step / 30) -
        experienceBuffer * 2
    );

    const mobility = clamp100(
      b.baselineMobility -
        fatigue * 0.42 -
        factors.terrainFactor * 12 -
        factors.loadFactor * 8 +
        experienceBuffer * 20
    );

    const endurance = clamp100(
      b.baselineEndurance -
        fatigue * 0.38 -
        factors.loadFactor * 10 -
        factors.durationFactor * progress * 14 -
        factors.altitudeFactor * 6 +
        experienceBuffer * 15
    );

    const strengthDrain =
      factors.loadFactor * 10 + fatigue * 0.2 + factors.terrainFactor * 5;
    const strengthAvail = clamp100(b.baselineStrength - strengthDrain);

    // Weighted combination — relative performance index
    const performance = clamp100(
      mobility * 0.3 +
        endurance * 0.35 +
        strengthAvail * 0.15 +
        (100 - fatigue) * 0.2
    );

    snapshots.push({
      timeMinutes: t,
      fatigue: round1(fatigue),
      mobility: round1(mobility),
      endurance: round1(endurance),
      performance: round1(performance),
    });
  }

  // Ensure final point at exact duration
  const last = snapshots[snapshots.length - 1]!;
  if (last.timeMinutes !== inputs.durationMinutes) {
    const prev = snapshots[snapshots.length - 2] ?? last;
    const final = interpolatePoint(prev, last, inputs.durationMinutes);
    if (last.timeMinutes > inputs.durationMinutes) {
      snapshots[snapshots.length - 1] = final;
    } else {
      snapshots.push(final);
    }
  }

  const explanations = buildExplanations(inputs, factors);

  return {
    factors,
    snapshots,
    final: snapshots[snapshots.length - 1]!,
    explanations,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function interpolatePoint(
  a: PerformancePoint,
  b: PerformancePoint,
  t: number
): PerformancePoint {
  const span = b.timeMinutes - a.timeMinutes || 1;
  const u = (t - a.timeMinutes) / span;
  const lerp = (x: number, y: number) => round1(x + (y - x) * u);
  return {
    timeMinutes: t,
    fatigue: lerp(a.fatigue, b.fatigue),
    mobility: lerp(a.mobility, b.mobility),
    endurance: lerp(a.endurance, b.endurance),
    performance: lerp(a.performance, b.performance),
  };
}

function buildExplanations(
  inputs: MissionInputs,
  factors: ReturnType<typeof normalizeFactors>
): string[] {
  const lines: string[] = [];
  if (factors.loadFactor > 0.45) {
    lines.push(
      `Load of ${inputs.loadKg} kg increased simulated workload.`
    );
  }
  if (factors.altitudeFactor > 0.4) {
    lines.push(
      `Altitude near ${inputs.altitudeMeters} m raised environmental stress.`
    );
  }
  if (factors.terrainFactor > 0.5) {
    lines.push(`Difficult terrain added movement demand.`);
  }
  if (factors.durationFactor > 0.4) {
    lines.push(
      `Mission duration of ${(inputs.durationMinutes / 60).toFixed(1)} h accumulated fatigue.`
    );
  }
  if (factors.recoveryFactor < 0.35) {
    lines.push(
      `Limited recovery (${inputs.restMinutes} min rest) reduced simulated recovery.`
    );
  } else {
    lines.push(
      `Rest periods (${inputs.restMinutes} min) partially offset fatigue accumulation.`
    );
  }
  if (inputs.timeOfDay === "NIGHT") {
    lines.push(`Night operations added incremental stress to the model.`);
  }
  return lines;
}
