"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Panel, StatusBadge } from "@/components/ui/primitives";
import { ReadinessGauge } from "@/components/ui/ReadinessGauge";
import { ChevronDown, ChevronUp, User, Users, Shield, ArrowRight } from "lucide-react";

export type UnitMapNode = {
  id: string;
  kind: "unit" | "squad" | "role" | "soldier";
  label: string;
  sublabel: string;
  x: number;
  y: number;
  index: number;
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
  source: "SIMULATED" | "BASELINE";
};

const KIND_W: Record<UnitMapNode["kind"], number> = {
  unit: 175,
  squad: 155,
  role: 145,
  soldier: 145,
};

const KIND_H = 50;

export function UnitMapClient({
  nodes,
  soldierMetrics,
  unitCapability,
  canvasHeight,
  scenarioName,
  scenarioId,
  highlightSoldierId,
}: {
  nodes: UnitMapNode[];
  soldierMetrics: Record<string, SoldierMetric>;
  unitCapability: number;
  canvasHeight: number;
  scenarioName: string;
  scenarioId?: string;
  highlightSoldierId: string | null;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    highlightSoldierId ? `soldier-${highlightSoldierId}` : null
  );
  const [whyExpanded, setWhyExpanded] = useState(false);

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

  const canvasWidth = 780;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
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
          <div className="grid grid-cols-4 gap-2 pt-3 text-center mono text-[10px] uppercase font-semibold tracking-widest text-[var(--gray-500)]">
            <div className="text-left pl-2 text-[var(--cyan)]">1. UNIT</div>
            <div className="text-left pl-4 text-[var(--gray-300)]">2. SQUADS</div>
            <div className="text-left pl-6 text-[var(--gray-300)]">3. ROLES</div>
            <div className="text-left pl-8 text-[var(--gray-300)]">4. SOLDIERS</div>
          </div>
        </div>

        {/* Interactive Topology Graph Canvas */}
        <Panel padded={false} className="relative overflow-hidden rounded-t-none">
          <div className="overflow-x-auto overflow-y-auto">
            <svg
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              width="100%"
              height={Math.min(680, canvasHeight)}
              className="min-w-[740px] bg-[radial-gradient(ellipse_at_20%_10%,rgba(85,216,245,0.04),transparent_60%)] select-none"
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
                      {Number.isFinite(node.index) ? Math.round(node.index) : "—"}
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
                      width={Math.max(0, Math.min(38, (node.index / 100) * 38))}
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
              <div className="label-xs mb-0.5">UNIT CAPABILITY</div>
              <div className="text-[14px] font-semibold text-[var(--white)]">
                Aggregated Simulated Performance
              </div>
            </div>
            <StatusBadge tone="cyan">TEAM</StatusBadge>
          </div>

          {/* Central Semi Gauge Anchor */}
          <div className="py-2 flex justify-center">
            <ReadinessGauge
              type="semi"
              value={unitCapability}
              size={200}
              label="SIMULATED INDEX"
            />
          </div>

          {/* 3 Compact Contribution Rows */}
          <div className="space-y-2.5 border-t border-[var(--border)] pt-4">
            <ContributionRow
              label="HUMAN PERFORMANCE"
              value={Math.round(unitCapability)}
            />
            <ContributionRow
              label="MOBILITY"
              value={Math.round(unitCapability * 0.96)}
            />
            <ContributionRow
              label="ENDURANCE"
              value={Math.round(unitCapability * 0.92)}
            />
          </div>

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
                  CAPABILITY COMPOSITION
                </div>
                <div className="flex justify-between">
                  <span>Performance Contribution</span>
                  <span className="mono tabular text-[var(--white)]">38%</span>
                </div>
                <div className="flex justify-between">
                  <span>Mobility Contribution</span>
                  <span className="mono tabular text-[var(--white)]">31%</span>
                </div>
                <div className="flex justify-between">
                  <span>Endurance Contribution</span>
                  <span className="mono tabular text-[var(--white)]">31%</span>
                </div>
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
                <MetricBox
                  label="FATIGUE"
                  value={Math.round(100 - selectedSoldierNode.index * 0.7)}
                />
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

function ContributionRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-[var(--gray-300)]">{label}</span>
        <span className="mono tabular font-semibold text-[var(--white)]">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--gray-800)] overflow-hidden">
        <div
          className="h-full bg-[var(--cyan)] transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
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
  value: number;
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
