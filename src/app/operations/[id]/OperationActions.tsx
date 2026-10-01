"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/primitives";

type SimilarMatch = {
  id: string;
  title: string;
  similarity: number;
};

export function SimulateSimilarButton({
  operationId,
  title,
  terrainType,
  altitudeMeters,
  temperatureCelsius,
  durationMinutes,
  timeOfDay,
}: {
  operationId: string;
  title: string;
  terrainType: string;
  altitudeMeters: number;
  temperatureCelsius: number;
  durationMinutes: number;
  timeOfDay: "DAY" | "NIGHT";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simulate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: {
            name: `Similar: ${title}`.slice(0, 120),
            terrainType,
            altitudeMeters,
            temperatureCelsius,
            loadKg: 18,
            distanceKm: 12,
            durationMinutes,
            restMinutes: 15,
            timeOfDay,
            description: `Simulated from historical operation ${title}`,
            sourceOperationId: operationId,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        run?: { scenarioId?: string };
      };
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to create simulation."
        );
        return;
      }
      const scenarioId = data.run?.scenarioId;
      if (!scenarioId) {
        setError("Simulation created but no scenario id returned.");
        return;
      }
      router.push(`/simulator/${scenarioId}`);
    } catch {
      setError("Network error while starting simulation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={simulate} disabled={busy} className="w-full">
        {busy ? "Creating Scenario…" : "Simulate Similar Scenario"}
      </Button>
      {error ? (
        <p className="text-[12px] text-[var(--gray-300)]">{error}</p>
      ) : null}
    </div>
  );
}

export function SimilarScenariosPanel({
  terrainType,
  altitudeMeters,
  temperatureCelsius,
  durationMinutes,
  timeOfDay,
  excludeId,
}: {
  terrainType: string;
  altitudeMeters: number;
  temperatureCelsius: number;
  durationMinutes: number;
  timeOfDay: "DAY" | "NIGHT";
  excludeId: string;
}) {
  const [matches, setMatches] = useState<SimilarMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/scenarios/similar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            terrainType,
            altitudeMeters,
            temperatureCelsius,
            durationMinutes,
            timeOfDay,
            loadKg: 18,
            restMinutes: 15,
            limit: 6,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          matches?: SimilarMatch[];
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setError(
              typeof data.error === "string"
                ? data.error
                : "Failed to load similar scenarios."
            );
          }
          return;
        }
        if (!cancelled) {
          setMatches(
            (data.matches ?? []).filter((m) => m.id !== excludeId).slice(0, 5)
          );
        }
      } catch {
        if (!cancelled) setError("Network error loading similar scenarios.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    terrainType,
    altitudeMeters,
    temperatureCelsius,
    durationMinutes,
    timeOfDay,
    excludeId,
  ]);

  return (
    <Panel className="!p-5">
      <SectionHeader
        title="Similar Scenarios"
        subtitle="Condition-matched historical operations"
        action={<StatusBadge tone="muted">SIMILARITY</StatusBadge>}
      />
      {loading ? (
        <p className="text-[13px] text-[var(--gray-500)]">Ranking matches…</p>
      ) : error ? (
        <p className="text-[13px] text-[var(--gray-300)]">{error}</p>
      ) : matches.length === 0 ? (
        <p className="text-[13px] text-[var(--gray-500)]">
          No other operations closely match these conditions.
        </p>
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => (
            <li key={m.id}>
              <Link
                href={`/operations/${m.id}`}
                className="flex items-center justify-between gap-3 rounded-[6px] border border-[var(--border)] px-3 py-2.5 transition-colors hover:border-[var(--cyan)]/35"
              >
                <span className="text-[13px] text-[var(--off-white)]">
                  {m.title}
                </span>
                <span className="mono tabular shrink-0 text-[13px] text-[var(--cyan)]">
                  {m.similarity}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
