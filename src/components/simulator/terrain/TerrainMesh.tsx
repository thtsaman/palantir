'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface TerrainMeshProps {
  getTerrainHeight: (x: number, z: number) => number;
}

export function TerrainMesh({ getTerrainHeight }: TerrainMeshProps) {
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

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          color="#0d192b"
          roughness={0.8}
          metalness={0.2}
          wireframe={false}
        />
      </mesh>
      
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
