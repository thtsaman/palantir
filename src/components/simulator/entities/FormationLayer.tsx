'use client';

import React, { useMemo } from 'react';
import { SoldierModel } from './SoldierModel';

interface FormationLayerProps {
  centerPosition: [number, number, number];
  headingAngle: number; // in radians
  isMoving: boolean;
  getTerrainHeight: (x: number, z: number) => number;
  roster?: Array<{ id: string; soldierCode: string }>;
  onSelectSoldier?: (id: string) => void;
  selectedSoldierId?: string | null;
}

interface SoldierOffset {
  id: string;
  dx: number;
  dz: number;
  scale?: number;
}

export function FormationLayer({
  centerPosition,
  headingAngle,
  isMoving,
  getTerrainHeight,
  roster = [],
  onSelectSoldier,
  selectedSoldierId = null,
}: FormationLayerProps) {
  const [cx, , cz] = centerPosition;

  // Position one rendered figure per real roster record; beyond 48, figures use a compact grid (LOD).
  const offsets = useMemo<SoldierOffset[]>(() => {
    const list: SoldierOffset[] = [];
    const compact = roster.length > 48;
    roster.forEach((member, index) => {
      const columns = compact ? Math.ceil(Math.sqrt(roster.length)) : 5;
      const col = index % columns;
      const row = Math.floor(index / columns);
      list.push({ id: member.id, dx: (col - (columns - 1) / 2) * (compact ? 2.2 : 1.8), dz: -row * 2.4, scale: compact ? 1.05 : 1.45 });
    });
    return list;
  }, [roster]);

  const cosAngle = Math.cos(headingAngle);
  const sinAngle = Math.sin(headingAngle);

  return (
    <group>
      {offsets.map((s, idx) => {
        // Rotate local offset according to heading
        const rx = s.dx * cosAngle - s.dz * sinAngle;
        const rz = s.dx * sinAngle + s.dz * cosAngle;

        const posX = cx + rx;
        const posZ = cz + rz;
        const posY = getTerrainHeight(posX, posZ);

        return (
          <SoldierModel
            key={s.id}
            position={[posX, posY, posZ]}
            rotationY={headingAngle}
            isMoving={isMoving}
            scale={s.scale || 1.6}
            isSelected={roster[idx]?.id === selectedSoldierId}
            soldierId={roster[idx]?.id}
            soldierCode={roster[idx]?.soldierCode}
            onSelect={() => roster[idx] && onSelectSoldier?.(roster[idx].id)}
          />
        );
      })}
    </group>
  );
}
