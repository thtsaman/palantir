'use client';

import React, { useMemo } from 'react';
import { SoldierModel } from './SoldierModel';

export type EchelonType = 'SOLDIER' | 'SQUAD' | 'PLATOON' | 'COMPANY' | 'BATTALION';

interface FormationLayerProps {
  centerPosition: [number, number, number];
  headingAngle: number; // in radians
  echelon: EchelonType;
  isMoving: boolean;
  getTerrainHeight: (x: number, z: number) => number;
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
  echelon,
  isMoving,
  getTerrainHeight,
}: FormationLayerProps) {
  const [cx, cy, cz] = centerPosition;

  // Compute deterministic relative offsets based on formation echelon hierarchy
  const offsets = useMemo<SoldierOffset[]>(() => {
    const list: SoldierOffset[] = [];

    if (echelon === 'SOLDIER') {
      list.push({ id: 's-0', dx: 0, dz: 0 });
    } else if (echelon === 'SQUAD') {
      // 5 soldiers in wedge tactical formation
      list.push({ id: 'sq-lead', dx: 0, dz: 0 });
      list.push({ id: 'sq-1', dx: -1.8, dz: -1.5 });
      list.push({ id: 'sq-2', dx: 1.8, dz: -1.5 });
      list.push({ id: 'sq-3', dx: -3.5, dz: -3.0 });
      list.push({ id: 'sq-4', dx: 3.5, dz: -3.0 });
    } else if (echelon === 'PLATOON') {
      // 3 Squads = 15 Soldiers
      const squadOffsets = [
        { sx: 0, sz: 0 },
        { sx: -8, sz: -6 },
        { sx: 8, sz: -6 },
      ];
      const baseSquad = [
        { dx: 0, dz: 0 },
        { dx: -1.5, dz: -1.5 },
        { dx: 1.5, dz: -1.5 },
        { dx: -3.0, dz: -3.0 },
        { dx: 3.0, dz: -3.0 },
      ];

      squadOffsets.forEach((sq, sqIdx) => {
        baseSquad.forEach((s, sIdx) => {
          list.push({
            id: `pl-${sqIdx}-${sIdx}`,
            dx: sq.sx + s.dx,
            dz: sq.sz + s.dz,
          });
        });
      });
    } else if (echelon === 'COMPANY') {
      // 3 Platoons = 45 Soldiers
      const platoonOffsets = [
        { px: 0, pz: 0 },
        { px: -18, pz: -12 },
        { px: 18, pz: -12 },
      ];
      const squadOffsets = [
        { sx: 0, sz: 0 },
        { sx: -6, sz: -4 },
        { sx: 6, sz: -4 },
      ];
      const baseSquad = [
        { dx: 0, dz: 0 },
        { dx: -1.2, dz: -1.2 },
        { dx: 1.2, dz: -1.2 },
        { dx: -2.4, dz: -2.4 },
        { dx: 2.4, dz: -2.4 },
      ];

      platoonOffsets.forEach((p, pIdx) => {
        squadOffsets.forEach((sq, sqIdx) => {
          baseSquad.forEach((s, sIdx) => {
            list.push({
              id: `co-${pIdx}-${sqIdx}-${sIdx}`,
              dx: p.px + sq.sx + s.dx,
              dz: p.pz + sq.sz + s.dz,
              scale: 1.4,
            });
          });
        });
      });
    } else if (echelon === 'BATTALION') {
      // 3 Companies = 135 Soldiers (Represented dynamically)
      const companyOffsets = [
        { cx: 0, cz: 0 },
        { cx: -32, cz: -20 },
        { cx: 32, cz: -20 },
      ];
      const platoonOffsets = [
        { px: 0, pz: 0 },
        { px: -12, pz: -8 },
        { px: 12, pz: -8 },
      ];
      const baseSquad = [
        { dx: 0, dz: 0 },
        { dx: -1.2, dz: -1.0 },
        { dx: 1.2, dz: -1.0 },
        { dx: -2.2, dz: -2.0 },
        { dx: 2.2, dz: -2.0 },
      ];

      companyOffsets.forEach((c, cIdx) => {
        platoonOffsets.forEach((p, pIdx) => {
          baseSquad.forEach((s, sIdx) => {
            list.push({
              id: `bat-${cIdx}-${pIdx}-${sIdx}`,
              dx: c.cx + p.px + s.dx,
              dz: c.cz + p.pz + s.dz,
              scale: 1.2,
            });
          });
        });
      });
    }

    return list;
  }, [echelon]);

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
            isSelected={idx === 0} // Highlight formation commander/lead
          />
        );
      })}
    </group>
  );
}
