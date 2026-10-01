"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SliderField } from "@/components/ui/SliderField";
import {
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const TERRAIN = [
  "FLAT",
  "ROLLING",
  "MOUNTAIN",
  "STEEP_MOUNTAIN",
  "MIXED",
] as const;

type TerrainType = (typeof TERRAIN)[number];
type TimeOfDay = "DAY" | "NIGHT";

const inputClass =
  "h-9 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--ink)] px-2.5 text-[13px] text-[var(--off-white)] focus:border-[var(--cyan)]/45 focus:outline-none";

export function MissionBuilder({
  soldierId,
  soldierCode,
  soldierRole,
  defaultLoadKg,
}: {
  soldierId: string | null;
  soldierCode: string | null;
  soldierRole: string | null;
  defaultLoadKg: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(
    soldierCode ? `${soldierCode} Mission Profile` : "Patrol Configuration"
  );
  const [terrainType, setTerrainType] = useState<TerrainType>("MOUNTAIN");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("DAY");
  const [altitudeMeters, setAltitudeMeters] = useState(3200);
  const [temperatureCelsius, setTemperatureCelsius] = useState(-4);
  const [loadKg, setLoadKg] = useState(defaultLoadKg);
  const [distanceKm, setDistanceKm] = useState(12);
  const [durationMinutes, setDurationMinutes] = useState(360);
  const [restMinutes, setRestMinutes] = useState(20);
  const [description, setDescription] = useState("");

  async function runSimulation() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soldierId: soldierId ?? undefined,
          scenario: {
            name: name.trim() || "Untitled Mission",
            terrainType,
            altitudeMeters,
            temperatureCelsius,
            loadKg,
            distanceKm,
            durationMinutes,
            restMinutes,
            timeOfDay,
            description: description.trim() || undefined,
            soldierId: soldierId ?? undefined,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        run?: { scenarioId?: string };
        scenarioId?: string;
      };
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Simulation request failed."
        );
        return;
      }
      const scenarioId = data.run?.scenarioId ?? data.scenarioId;
      if (!scenarioId) {
        setError("Simulation completed but no scenario id was returned.");
        return;
      }
      router.push(`/simulator/${scenarioId}`);
    } catch {
      setError("Network error while running simulation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel className="!p-5 space-y-5">
        <SectionHeader
          title="Mission Configuration"
          subtitle="Environmental and timeline parameters"
          action={<StatusBadge tone="cyan">SIMULATED</StatusBadge>}
        />

        <label className="block space-y-1.5">
          <span className="label-xs">Mission name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="High Altitude Patrol"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="label-xs">Terrain</span>
            <select
              value={terrainType}
              onChange={(e) => setTerrainType(e.target.value as TerrainType)}
              className={inputClass}
            >
              {TERRAIN.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-1.5">
            <legend className="label-xs">Time of day</legend>
            <div className="flex gap-2">
              {(["DAY", "NIGHT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeOfDay(t)}
                  className={cn(
                    "h-9 flex-1 rounded-[6px] border text-[12px] font-medium tracking-wide transition-colors",
                    timeOfDay === t
                      ? "border-[var(--cyan)]/40 bg-[var(--cyan-dim)] text-[var(--cyan)]"
                      : "border-[var(--border-strong)] text-[var(--gray-300)] hover:border-[var(--cyan)]/30"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SliderField
            label="Altitude"
            value={altitudeMeters}
            min={0}
            max={6000}
            step={50}
            unit="m"
            onChange={setAltitudeMeters}
          />
          <SliderField
            label="Temperature"
            value={temperatureCelsius}
            min={-30}
            max={45}
            step={1}
            unit="°C"
            onChange={setTemperatureCelsius}
          />
          <SliderField
            label="Load"
            value={loadKg}
            min={5}
            max={40}
            step={0.5}
            unit="kg"
            onChange={setLoadKg}
          />
          <SliderField
            label="Distance"
            value={distanceKm}
            min={1}
            max={40}
            step={0.5}
            unit="km"
            onChange={setDistanceKm}
          />
          <SliderField
            label="Duration"
            value={durationMinutes}
            min={30}
            max={840}
            step={15}
            onChange={setDurationMinutes}
            formatValue={(v) => `${(v / 60).toFixed(v % 60 === 0 ? 0 : 1)} h`}
          />
          <SliderField
            label="Rest"
            value={restMinutes}
            min={0}
            max={120}
            step={5}
            unit="min"
            onChange={setRestMinutes}
          />
        </div>

        <label className="block space-y-1.5">
          <span className="label-xs">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--ink)] px-2.5 py-2 text-[13px] text-[var(--off-white)] focus:border-[var(--cyan)]/45 focus:outline-none"
            placeholder="Notes on route difficulty, exposure, or load plan…"
          />
        </label>

        {error ? (
          <p className="rounded-[6px] border border-[var(--border-strong)] bg-[var(--gray-800)] px-3 py-2 text-[12px] text-[var(--gray-100)]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <Button onClick={runSimulation} disabled={busy}>
            {busy ? "Running…" : "Run Simulation"}
          </Button>
          <Button href="/missions" variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel className="!p-5 space-y-4">
          <SectionHeader
            title="Subject"
            subtitle="Optional soldier baseline"
            action={<StatusBadge tone="cyan">BASELINE</StatusBadge>}
          />
          {soldierId && soldierCode ? (
            <div>
              <div className="mono text-[22px] font-medium text-[var(--cyan)]">
                {soldierCode}
              </div>
              <p className="mt-1 text-[13px] text-[var(--gray-300)]">
                {soldierRole ?? "Assigned role"}
              </p>
              <p className="mt-3 text-[12px] text-[var(--gray-500)]">
                Typical load seeded to{" "}
                <span className="mono tabular text-[var(--off-white)]">
                  {defaultLoadKg} kg
                </span>
                . Adjust freely for what-if analysis.
              </p>
              <div className="mt-4">
                <Button href={`/soldiers/${soldierId}`} variant="secondary" size="sm">
                  View Profile
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[13px] text-[var(--gray-300)]">
                No soldier selected. Simulation will use a generic baseline
                profile.
              </p>
              <div className="mt-3">
                <Button href="/soldiers" variant="secondary" size="sm">
                  Choose from Library
                </Button>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="!p-5 space-y-3">
          <SectionHeader title="Condition Summary" />
          <SummaryRow label="Terrain" value={terrainType.replaceAll("_", " ")} />
          <SummaryRow label="Time" value={timeOfDay} />
          <SummaryRow label="Altitude" value={`${altitudeMeters} m`} mono />
          <SummaryRow label="Temperature" value={`${temperatureCelsius}°C`} mono />
          <SummaryRow label="Load" value={`${loadKg} kg`} mono />
          <SummaryRow label="Distance" value={`${distanceKm} km`} mono />
          <SummaryRow
            label="Duration"
            value={`${(durationMinutes / 60).toFixed(durationMinutes % 60 === 0 ? 0 : 1)} h`}
            mono
          />
          <SummaryRow label="Rest" value={`${restMinutes} min`} mono />
          <p className="pt-2 text-[11px] text-[var(--gray-500)]">
            Outputs are prototype relative indices for comparison — not clinical
            or combat-effectiveness scores.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] pb-2 text-[13px]">
      <span className="text-[var(--gray-500)]">{label}</span>
      <span
        className={
          mono
            ? "mono tabular text-[var(--cyan)]"
            : "text-right text-[var(--off-white)]"
        }
      >
        {value}
      </span>
    </div>
  );
}
