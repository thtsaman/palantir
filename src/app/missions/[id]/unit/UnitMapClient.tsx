"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Panel, StatusBadge } from "@/components/ui/primitives";
import { ReadinessGauge } from "@/components/ui/ReadinessGauge";
import { ChevronDown, ChevronUp, User, Users, Shield, ArrowRight } from "lucide-react";
import type { MissionInputs } from "@/lib/simulation";
import { HistoricalContextPanel } from "@/components/historical/HistoricalContextPanel";
import { GroupReadinessPanel } from "@/components/readiness/GroupReadinessPanel";
import type { SoldierBaseline, PerformancePoint } from "@/lib/simulation";

export type UnitMapNode = {
  id: string;
  kind: "unit" | "company" | "platoon" | "squad" | "role" | "soldier";
  label: string;
  sublabel: string;
  x: number;
  y: number;
  index: number | null;
  parentId?: string;
  soldierId?: string;
  source?: "SIMULATED" | "BASELINE";
};

type SoldierMetric = {
  id: string;
  soldierCode: string;
  roleName: string;
  squadName: string;
  unitName: string;
  index: number;
  mobility: number;
  endurance: number;
  strength: number;
  recovery: number;
  fatigue: number | null;
  source: "SIMULATED" | "BASELINE";
};

const KIND_W: Record<UnitMapNode["kind"], number> = {
  unit: 140,
  company: 132,
  platoon: 132,
  squad: 132,
  role: 132,
  soldier: 132,
};

const KIND_H = 50;
type GroupRunMember = { id: string; soldierCode: string; roleName: string | null; included: boolean; profileQuality: "COMPLETE" | "PROVENANCE_UNKNOWN" | "SYNTHETIC_DEMO" | "INCOMPLETE"; baseline: SoldierBaseline | null; final: PerformancePoint | null; timeline: Array<{ timeMinutes: number; performance: number }> };
type GroupType = "UNIT" | "COMPANY" | "PLATOON" | "SQUAD";
type GroupRun = { id: string; groupLabel: string; modelVersion: string; inputs: MissionInputs; includedCount: number; excludedCount: number; incompleteCount: number; syntheticCount: number; aggregate: Record<string, { mean: number | null; median: number | null; minimum: number | null; maximum: number | null; distribution: Array<{ soldierCode: string; value: number }> }>; members: GroupRunMember[] };

export function UnitMapClient({
  nodes,
  soldierMetrics,
  unitCapability,
  mapSourceCounts,
  canvasHeight,
  scenarioId,
  highlightSoldierId,
  missionInputs,
  groupOptions,
}: {
  nodes: UnitMapNode[];
  soldierMetrics: Record<string, SoldierMetric>;
  unitCapability: number | null;
  mapSourceCounts: { simulated: number; baseline: number };
  canvasHeight: number;
  scenarioId?: string;
  highlightSoldierId: string | null;
  missionInputs: MissionInputs;
  groupOptions: Array<{ id: string; groupType: GroupType; label: string; memberCount: number }>;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    highlightSoldierId ? `soldier-${highlightSoldierId}` : null
  );
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [groupSelection, setGroupSelection] = useState(groupOptions.find((group) => group.groupType === "SQUAD")?.id ?? groupOptions[0]?.id ?? "");
  const [groupResult, setGroupResult] = useState<GroupRun | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupBusy, setGroupBusy] = useState(false);
  const selectedGroup = groupOptions.find((group) => group.id === groupSelection);

  useEffect(() => {
    if (!selectedGroup) return;
    fetch(`/api/group-simulations?groupType=${selectedGroup.groupType}&groupId=${selectedGroup.id}&scenarioId=${scenarioId ?? ""}`)
      .then(async (response) => response.ok ? response.json() as Promise<GroupRun[]> : [])
      .then((runs) => setGroupResult(runs[0] ?? null))
      .catch(() => setGroupResult(null));
  }, [selectedGroup, scenarioId]);

  async function runGroupSimulation() {
    if (!selectedGroup) return;
    setGroupBusy(true); setGroupError(null);
    try {
      const response = await fetch("/api/group-simulations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupType: selectedGroup.groupType, groupId: selectedGroup.id, scenarioId, inputs: missionInputs }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Group simulation failed.");
      setGroupResult(data);
    } catch (error) { setGroupError(error instanceof Error ? error.message : "Group simulation failed."); }
    finally { setGroupBusy(false); }
  }

  const byId = useMemo(() => {
    return new Map(nodes.map((n) => [n.id, n]));
  }, [nodes]);

  // Compute active node IDs (focus path calculation)
  const activeNodeIds = useMemo(() => {
    if (!selectedNodeId || !byId.has(selectedNodeId)) return new Set<string>();

    const activeSet = new Set<string>([selectedNodeId]);

    // 1. Ancestors (upwards to Unit)
    let curr = byId.get(selectedNodeId);
    while (curr && curr.parentId) {
      activeSet.add(curr.parentId);
      curr = byId.get(curr.parentId);
    }

    // 2. Descendants (downwards to Soldiers)
    const addChildren = (parentId: string) => {
      nodes.forEach((n) => {
        if (n.parentId === parentId) {
          activeSet.add(n.id);
          addChildren(n.id);
        }
      });
    };
    addChildren(selectedNodeId);

    return activeSet;
  }, [selectedNodeId, byId, nodes]);

  // Active edges
  const edges = useMemo(() => {
    return nodes
      .filter((n) => n.parentId && byId.has(n.parentId))
      .map((n) => {
        const parent = byId.get(n.parentId!)!;
        const pw = KIND_W[parent.kind];
        const cw = KIND_W[n.kind];
        const isPathActive =
          activeNodeIds.size > 0 &&
          activeNodeIds.has(n.id) &&
          activeNodeIds.has(parent.id);

        return {
          id: `${parent.id}->${n.id}`,
          sourceId: parent.id,
          targetId: n.id,
          x1: parent.x + pw / 2,
          y1: parent.y + KIND_H / 2,
          x2: n.x - cw / 2,
          y2: n.y + KIND_H / 2,
          active: isPathActive,
        };
      });
  }, [nodes, byId, activeNodeIds]);

  // Selected soldier object (if selected node is a soldier or parent selection contains soldier)
  const selectedSoldierNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = byId.get(selectedNodeId);
    if (node && node.kind === "soldier" && node.soldierId) {
      return soldierMetrics[node.soldierId] ?? null;
    }
    return null;
  }, [selectedNodeId, byId, soldierMetrics]);

  const soldierCount = useMemo(() => nodes.filter((n) => n.kind === "soldier").length, [nodes]);
  const squadCount = useMemo(() => nodes.filter((n) => n.kind === "squad").length, [nodes]);
  const unitCount = useMemo(() => nodes.filter((n) => n.kind === "unit").length, [nodes]);

  const canvasWidth = 980;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
      <Panel className="xl:col-span-2 !p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block min-w-[260px] flex-1 space-y-1.5"><span className="label-xs">Persisted group roster</span><select value={groupSelection} onChange={(event) => setGroupSelection(event.target.value)} className="h-9 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--ink)] px-2.5 text-[13px] text-[var(--off-white)]">{groupOptions.map((group) => <option key={`${group.groupType}-${group.id}`} value={group.id}>{group.label} · {group.groupType.toLowerCase()} · {group.memberCount} soldiers</option>)}</select></label>
          <Button onClick={runGroupSimulation} disabled={groupBusy || !selectedGroup}>{groupBusy ? "Simulating roster…" : "Run Group Simulation"}</Button>
        </div>
        <p className="text-[11px] text-[var(--gray-500)]">Uses this mission configuration for each active soldier in the selected saved group. Individual baselines are used without generic fallback. Inactive and incomplete members are reported separately.</p>
        {groupError ? <p className="text-[12px] text-rose-300">{groupError}</p> : null}
        {groupResult ? <div className="space-y-4 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-center gap-4 text-[12px]"><StatusBadge tone="cyan">SAVED GROUP RUN</StatusBadge><span>{groupResult.groupLabel}</span><span>{groupResult.includedCount} included</span><span>{groupResult.excludedCount} excluded</span><span>{groupResult.incompleteCount} incomplete/provenance unknown</span><span>{groupResult.syntheticCount} synthetic demo</span></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(groupResult.aggregate).map(([key, stats]) => <div key={key} className="rounded border border-[var(--border)] bg-[#090f1b] p-3"><div className="label-xs">{key}</div><div className="mono text-[12px] text-[var(--cyan)]">Mean {stats.mean ?? "—"} · Median {stats.median ?? "—"}</div><div className="mono text-[10px] text-[var(--gray-400)]">Range {stats.minimum ?? "—"}–{stats.maximum ?? "—"}</div></div>)}</div>
          <div className="max-h-64 overflow-auto"><table className="w-full text-left text-[11px]"><thead className="text-[var(--gray-500)]"><tr><th className="py-1">Soldier</th><th>Status</th><th>Performance</th><th>Fatigue</th><th>Profile data</th><th>Timeline</th></tr></thead><tbody>{groupResult.members.map((member) => <tr key={member.id} className="border-t border-[var(--border)]"><td className="py-1.5"><Link className="text-[var(--cyan)] hover:underline" href={`/soldiers/${member.id}`}>{member.soldierCode}</Link></td><td>{member.included ? "Included" : "Excluded"}</td><td>{member.final?.performance ?? "—"}</td><td>{member.final?.fatigue ?? "—"}</td><td>{member.profileQuality.replaceAll("_", " ")}</td><td>{member.timeline.length} points</td></tr>)}</tbody></table></div>
          <p className="text-[10px] text-[var(--gray-500)]">Distribution uses each included soldier’s final prototype index. Summary statistics do not represent readiness thresholds. Per-soldier time series and baseline snapshots are saved with this run.</p>
          <GroupReadinessPanel groupLabel={groupResult.groupLabel} modelVersion={groupResult.modelVersion} members={groupResult.members} inputs={groupResult.inputs} />
        </div> : null}
        <div className="border-t border-[var(--border)] pt-4"><HistoricalContextPanel inputs={missionInputs} label="Historical context · group-level mission conditions" compact /><p className="mt-2 text-[10px] text-[var(--gray-500)]">These records describe historical conditions and lessons. They do not predict performance for this roster or any individual member.</p></div>
      </Panel>
      {/* LEFT: MAIN UNIT FLOW VISUALIZATION */}
      <div className="flex flex-col gap-3">
        {/* Topology Stage Column Titles & Metadata */}
        <div className="rounded-t-lg border border-[var(--border)] bg-[var(--ink-panel)] px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/60 pb-3">
            <div>
              <div className="label-xs mb-0.5 text-[var(--cyan)]">INDIVIDUAL → TEAM</div>
              <div className="text-[13px] font-medium text-[var(--gray-300)]">
                How performance rolls through the unit hierarchy
              </div>
            </div>
            {/* Inline Mini Legend & Metadata */}
            <div className="flex items-center gap-4 text-[11px] text-[var(--gray-500)] mono">
              <div className="flex items-center gap-3 border-r border-[var(--border)] pr-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-[var(--cyan)]" /> SIMULATED
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-[var(--gray-500)]" /> BASELINE
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm border border-[var(--cyan)] bg-[var(--cyan-dim)]" /> SELECTED
                </span>
              </div>
              <div className="text-[11px] text-[var(--gray-300)] font-medium">
                {soldierCount} SOLDIERS · {squadCount} SQUADS · {unitCount} UNIT
              </div>
            </div>
          </div>

          {/* Column Stage Headers */}
          <div className="grid grid-cols-6 gap-1 pt-3 text-center mono text-[9px] uppercase font-semibold tracking-widest text-[var(--gray-500)]">
            <div className="text-left text-[var(--cyan)]">1. UNIT</div>
            <div className="text-left">2. COMPANY</div>
            <div className="text-left">3. PLATOON</div>
            <div className="text-left">4. SQUAD</div>
            <div className="text-left">5. ROLE</div>
            <div className="text-left">6. SOLDIER</div>
          </div>
        </div>

        {/* Interactive Topology Graph Canvas */}
        <Panel padded={false} className="relative overflow-hidden rounded-t-none">
          <div className="overflow-x-auto overflow-y-auto">
            <svg
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              width="100%"
              height={Math.min(680, canvasHeight)}
              className="min-w-[920px] bg-[radial-gradient(ellipse_at_20%_10%,rgba(85,216,245,0.04),transparent_60%)] select-none"
              role="img"
              aria-label="Unit capability map"
            >
              {/* Connection Lines */}
              {edges.map((e) => (
                <path
                  key={e.id}
                  d={connectorPath(e.x1, e.y1, e.x2, e.y2)}
                  fill="none"
                  stroke={e.active ? "#55D8F5" : "rgba(232,236,241,0.1)"}
                  strokeWidth={e.active ? "2" : "1"}
                  strokeDasharray={e.active ? undefined : "3 3"}
                  className="transition-all duration-200"
                />
              ))}

              {/* Stage Nodes */}
              {nodes.map((node) => {
                const w = KIND_W[node.kind];
                const h = KIND_H;
                const x = node.x - w / 2;
                const y = node.y;
                const isSelected = selectedNodeId === node.id;
                const isInActivePath = activeNodeIds.has(node.id);
                const hasActiveSelection = activeNodeIds.size > 0;

                const opacity = hasActiveSelection
                  ? isInActivePath
                    ? 1
                    : 0.35
                  : 1;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer transition-opacity duration-200"
                    style={{ opacity }}
                    onClick={() => {
                      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
                    }}
                  >
                    {/* Node Container Card */}
                    <rect
                      width={w}
                      height={h}
                      rx={6}
                      fill={
                        isSelected
                          ? "rgba(85, 216, 245, 0.16)"
                          : isInActivePath
                          ? "rgba(15, 23, 36, 0.98)"
                          : "rgba(15, 23, 36, 0.9)"
                      }
                      stroke={
                        isSelected
                          ? "#55D8F5"
                          : isInActivePath
                          ? "rgba(85, 216, 245, 0.6)"
                          : "rgba(232, 236, 241, 0.12)"
                      }
                      strokeWidth={isSelected ? 1.6 : 1}
                    />

                    {/* Node Type Indicator Line */}
                    <line
                      x1={0}
                      y1={4}
                      x2={0}
                      y2={h - 4}
                      stroke={
                        node.kind === "unit"
                          ? "#55D8F5"
                          : node.kind === "squad"
                          ? "#9AA3B2"
                          : "rgba(232, 236, 241, 0.25)"
                      }
                      strokeWidth={3}
                    />

                    {/* Node Title */}
                    <text
                      x={10}
                      y={18}
                      fill={
                        node.kind === "unit"
                          ? "var(--cyan)"
                          : isSelected
                          ? "var(--white)"
                          : "var(--off-white)"
                      }
                      fontSize={11}
                      fontWeight={600}
                    >
                      {truncate(node.label, 16)}
                    </text>

                    {/* Sublabel / Code */}
                    <text
                      x={10}
                      y={32}
                      fill="rgba(154, 163, 178, 0.9)"
                      fontSize={9}
                      fontFamily="var(--font-mono)"
                    >
                      {truncate(node.sublabel, 15)}
                    </text>

                    {/* Numerical Simulated Index */}
                    <text
                      x={w - 10}
                      y={22}
                      textAnchor="end"
                      fill={node.kind === "unit" ? "var(--cyan)" : "#55D8F5"}
                      fontSize={13}
                      fontWeight={600}
                      fontFamily="var(--font-mono)"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {node.index != null && Number.isFinite(node.index) ? Math.round(node.index) : "—"}
                    </text>

                    {/* Micro Performance Bar */}
                    <rect
                      x={w - 48}
                      y={28}
                      width={38}
                      height={4}
                      rx={2}
                      fill="rgba(232,236,241,0.08)"
                    />
                    <rect
                      x={w - 48}
                      y={28}
                      width={Math.max(0, Math.min(38, ((node.index ?? 0) / 100) * 38))}
                      height={4}
                      rx={2}
                      fill={isSelected ? "#55D8F5" : "rgba(85,216,245,0.7)"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Visual Story Sentence Footer */}
          <div className="border-t border-[var(--border)] bg-[#0a101d] px-5 py-2.5 flex items-center justify-between text-[11px] text-[var(--gray-300)]">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-[var(--cyan)]" />
              <span>
                Individual performance is simulated first. Team capability is derived from the human state.
              </span>
            </div>
            {selectedNodeId && (
              <button
                onClick={() => setSelectedNodeId(null)}
                className="mono text-[10px] text-[var(--cyan)] hover:underline"
              >
                RESET SELECTION
              </button>
            )}
          </div>
        </Panel>
      </div>

      {/* RIGHT COLUMN: CAPABILITY & SELECTED HUMAN PANELS */}
      <div className="space-y-4">
        {/* 1. UNIT CAPABILITY PANEL */}
        <Panel className="!p-5 space-y-4 relative">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
                <div className="label-xs mb-0.5">SCENARIO ROSTER MEAN</div>
              <div className="text-[14px] font-semibold text-[var(--white)]">
                Saved run or baseline indices
              </div>
            </div>
            <StatusBadge tone="cyan">TEAM</StatusBadge>
          </div>

          {/* Central Semi Gauge Anchor */}
          {unitCapability != null ? <div className="py-2 flex justify-center">
            <ReadinessGauge
              type="semi"
              value={unitCapability}
              size={200}
              label="ROSTER MEAN"
              sublabel="relative index"
            />
          </div> : <p className="py-8 text-center text-[12px] text-[var(--gray-500)]">No members are assigned in this organization.</p>}

          <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--gray-300)]"><div>Scenario run values <span className="mono text-[var(--cyan)]">{mapSourceCounts.simulated}</span></div><div>Baseline fallbacks <span className="mono text-[var(--gray-300)]">{mapSourceCounts.baseline}</span></div></div>

          {/* Expandable "WHY THIS SCORE?" Section */}
          <div className="border-t border-[var(--border)] pt-3">
            <button
              onClick={() => setWhyExpanded(!whyExpanded)}
              className="flex w-full items-center justify-between text-[12px] font-medium text-[var(--gray-300)] hover:text-[var(--cyan)]"
            >
              <span>WHY THIS SCORE?</span>
              {whyExpanded ? (
                <ChevronUp className="h-4 w-4 text-[var(--cyan)]" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {whyExpanded && (
              <div className="mt-3 space-y-2.5 rounded border border-[var(--border)] bg-[#090f1b] p-3 text-[11px] text-[var(--gray-300)]">
                <div className="mono text-[10px] uppercase font-semibold text-[var(--cyan)] tracking-wider">
                  DATA METHOD
                </div>
                <p>Each member uses the latest saved run for this mission when present; otherwise the displayed map index is the mean of four stored baseline indices. This is a descriptive roster summary, not a readiness threshold.</p>
                <div className="border-t border-[var(--border)]/60 pt-2 flex justify-between text-[10px] text-[var(--gray-500)]">
                  <span>MODEL VERSION</span>
                  <span className="mono">PROTOTYPE AGGREGATION MODEL</span>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* 2. SELECTED HUMAN PANEL */}
        <Panel className="!p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <div className="label-xs mb-0.5">INDIVIDUAL STATE</div>
              <div className="text-[14px] font-semibold text-[var(--white)]">
                SELECTED HUMAN
              </div>
            </div>
            <StatusBadge tone={selectedSoldierNode ? "cyan" : "muted"}>
              {selectedSoldierNode ? selectedSoldierNode.soldierCode : "NO SELECTION"}
            </StatusBadge>
          </div>

          {selectedSoldierNode ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[var(--cyan)]" />
                  <span className="mono text-[20px] font-semibold text-[var(--cyan)]">
                    {selectedSoldierNode.soldierCode}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--gray-300)]">
                  {selectedSoldierNode.roleName} · {selectedSoldierNode.squadName} · {selectedSoldierNode.unitName}
                </p>
              </div>

              {/* 4 Metric Composition Block */}
              <div className="grid grid-cols-2 gap-2.5 rounded bg-[#090f1b] p-3 border border-[var(--border)]">
                <MetricBox
                  label="PERFORMANCE"
                  value={selectedSoldierNode.index}
                  primary
                />
                <MetricBox
                  label="MOBILITY"
                  value={selectedSoldierNode.mobility}
                />
                <MetricBox
                  label="ENDURANCE"
                  value={selectedSoldierNode.endurance}
                />
                <MetricBox label="FATIGUE" value={selectedSoldierNode.fatigue == null ? "—" : Math.round(selectedSoldierNode.fatigue)} />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  href={`/soldiers/${selectedSoldierNode.id}`}
                  className="w-full justify-between"
                  size="sm"
                >
                  <span>VIEW HUMAN PROFILE</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  href={`/missions/new?soldierId=${selectedSoldierNode.id}`}
                  variant="secondary"
                  className="w-full justify-between"
                  size="sm"
                >
                  <span>SIMULATE SOLDIER</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-[12px] text-[var(--gray-500)] space-y-2">
              <Users className="mx-auto h-8 w-8 text-[var(--gray-700)]" />
              <p className="text-[13px] text-[var(--gray-300)]">
                No soldier selected
              </p>
              <p className="text-[11px] text-[var(--gray-500)] max-w-[220px] mx-auto">
                Click any soldier node on the visual map to inspect individual performance and drill down into profiles.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: number | string;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between">
      <span className="text-[9px] uppercase tracking-wider text-[var(--gray-500)] font-medium">
        {label}
      </span>
      <span
        className={`mono tabular text-lg font-semibold ${
          primary ? "text-[var(--cyan)]" : "text-[var(--white)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function connectorPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

function truncate(str: string, maxLen: number) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + "…";
}
