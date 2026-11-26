'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { TerrainType } from '@/lib/simulation/types';
import { terrainProfile } from './profiles';

interface TerrainMeshProps {
  getTerrainHeight: (x: number, z: number) => number;
  terrainType: TerrainType;
}

export function TerrainMesh({ getTerrainHeight, terrainType }: TerrainMeshProps) {
  const profile = terrainProfile(terrainType);
  const { geometry } = useMemo(() => {
    const size = 300;
    const segments = 100;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getTerrainHeight(x, z);
      pos.setY(i, y);
    }
    geom.computeVertexNormals();
    return { geometry: geom };
  }, [getTerrainHeight]);

  const props = useMemo(() => {
    const items: Array<{ x: number; z: number; scale: number }> = [];
    if (profile.vegetation !== 'none') {
      for (let i = 0; i < 76; i++) {
        const x = ((i * 47) % 270) - 135;
        const z = ((i * 83) % 270) - 135;
        if (Math.abs(x) < 13 || Math.abs(z - x * 0.35) < 9) continue;
        items.push({ x, z, scale: 0.7 + (i % 5) * 0.11 });
      }
    }
    return items;
  }, [profile.vegetation]);

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          color={profile.color}
          roughness={profile.roughness}
          metalness={0.02}
          wireframe={false}
        />
      </mesh>

      {profile.vegetation === 'forest' && props.map((item, i) => {
        const y = getTerrainHeight(item.x, item.z);
        return <group key={i} position={[item.x, y, item.z]} scale={item.scale}>
          <mesh position={[0, 2, 0]} castShadow><cylinderGeometry args={[0.22, 0.38, 4, 6]} /><meshStandardMaterial color="#594834" /></mesh>
          <mesh position={[0, 5, 0]} castShadow><coneGeometry args={[2.1, 5.5, 7]} /><meshStandardMaterial color={i % 2 ? "#315d43" : profile.accent} /></mesh>
        </group>;
      })}
      {profile.vegetation === 'sparse' && props.map((item, i) => {
        if (i % 3 !== 0) return null;
        const y = getTerrainHeight(item.x, item.z);
        return <mesh key={i} position={[item.x, y + 0.5, item.z]} scale={item.scale} castShadow>
          <dodecahedronGeometry args={[0.75, 0]} /><meshStandardMaterial color={profile.accent} roughness={1} />
        </mesh>;
      })}
      
      {/* Tactical Wireframe Overlay */}
      <mesh geometry={geometry} position={[0, 0.05, 0]}>
        <meshBasicMaterial
          color="#1b324d"
          wireframe={true}
          transparent={true}
          opacity={0.15}
        />
      </mesh>

      {/* Grid Ground Base */}
      <gridHelper args={[300, 60, '#1b3b5a', '#0d2238']} position={[0, -0.1, 0]} />
    </group>
  );
}

interface MissionRouteProps {
  waypoints: [number, number, number][];
}

export function MissionRoute({ waypoints }: MissionRouteProps) {
  const routePoints = useMemo(() => {
    if (waypoints.length < 2) return [];
    return waypoints.map((wp) => new THREE.Vector3(wp[0], wp[1] + 0.3, wp[2]));
  }, [waypoints]);

  const curve = useMemo(() => {
    if (routePoints.length < 2) return null;
    return new THREE.CatmullRomCurve3(routePoints);
  }, [routePoints]);

  const tubeGeometry = useMemo(() => {
    if (!curve) return null;
    return new THREE.TubeGeometry(curve, 120, 0.25, 8, false);
  }, [curve]);

  if (!tubeGeometry) return null;

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial color="#55D8F5" transparent opacity={0.6} />
      </mesh>
      {waypoints.map((wp, i) => (
        <mesh key={i} position={[wp[0], wp[1] + 0.4, wp[2]]}>
          <cylinderGeometry args={[0.6, 0.6, 0.2, 16]} />
          <meshBasicMaterial color={i === 0 ? '#10B981' : i === waypoints.length - 1 ? '#EF4444' : '#55D8F5'} />
        </mesh>
      ))}
    </group>
  );
}
