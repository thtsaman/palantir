'use client';

import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three-stdlib';
import * as THREE from 'three';

interface CameraControllerProps {
  targetPosition: [number, number, number];
  cameraMode: 'OVERVIEW' | 'FOLLOW' | 'TOP' | '3D';
}

export function CameraController({ targetPosition, cameraMode }: CameraControllerProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const targetVec = useRef(new THREE.Vector3());

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
    controlsRef.current = controls;

    return () => {
      controls.dispose();
    };
  }, [camera, gl]);

  useEffect(() => {
    if (!controlsRef.current) return;

    if (cameraMode === 'TOP') {
      camera.position.set(targetPosition[0], targetPosition[1] + 80, targetPosition[2] + 0.1);
      controlsRef.current.target.set(targetPosition[0], targetPosition[1], targetPosition[2]);
    } else if (cameraMode === 'OVERVIEW') {
      camera.position.set(targetPosition[0] + 40, targetPosition[1] + 50, targetPosition[2] + 60);
      controlsRef.current.target.set(targetPosition[0], targetPosition[1], targetPosition[2]);
    }
  }, [cameraMode]);

  useFrame(() => {
    if (!controlsRef.current) return;

    targetVec.current.set(targetPosition[0], targetPosition[1] + 1, targetPosition[2]);

    if (cameraMode === 'FOLLOW') {
      // Smoothly update controls target to track formation lead
      controlsRef.current.target.lerp(targetVec.current, 0.08);
      
      // Maintain camera offset relative to target
      const offset = new THREE.Vector3(0, 12, 22);
      const desiredCamPos = targetVec.current.clone().add(offset);
      camera.position.lerp(desiredCamPos, 0.05);
    }

    controlsRef.current.update();
  });

  return null;
}
