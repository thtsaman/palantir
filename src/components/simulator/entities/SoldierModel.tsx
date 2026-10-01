'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

const SOLDIER_GLB_PATH = '/models/soldier/soldier.glb';

// Preload asset immediately
useGLTF.preload(SOLDIER_GLB_PATH);

interface SoldierModelProps {
  position: [number, number, number];
  rotationY: number;
  isMoving: boolean;
  scale?: number;
  isSelected?: boolean;
}

export function SoldierModel({
  position,
  rotationY,
  isMoving,
  scale = 1.6,
  isSelected = false,
}: SoldierModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<{ [key: string]: THREE.AnimationAction }>({});

  const { scene, animations } = useGLTF(SOLDIER_GLB_PATH);

  // Clone scene so each soldier instance gets its own skeletal hierarchy
  const clonedScene = useMemo(() => {
    return SkeletonUtils.clone(scene);
  }, [scene]);

  useEffect(() => {
    if (!clonedScene || !animations.length) return;

    const mixer = new THREE.AnimationMixer(clonedScene);
    mixerRef.current = mixer;

    const actions: { [key: string]: THREE.AnimationAction } = {};
    
    animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      actions[clip.name.toLowerCase()] = action;
      // Also map common standard names
      if (clip.name.toLowerCase().includes('idle')) actions['idle'] = action;
      if (clip.name.toLowerCase().includes('walk') || clip.name.toLowerCase().includes('run')) {
        actions['walk'] = action;
        actions['run'] = action;
      }
    });

    actionsRef.current = actions;

    // Start with Idle action or first clip available
    const defaultAction = actions['idle'] || actions[animations[0].name.toLowerCase()];
    if (defaultAction) {
      defaultAction.play();
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [clonedScene, animations]);

  // Handle animation transitions between Idle and Walk
  useEffect(() => {
    const actions = actionsRef.current;
    if (!actions) return;

    const walkAction = actions['walk'] || actions['run'];
    const idleAction = actions['idle'];

    if (isMoving) {
      if (idleAction && walkAction) {
        idleAction.fadeOut(0.2);
        walkAction.reset().fadeIn(0.2).play();
      } else if (walkAction) {
        walkAction.play();
      }
    } else {
      if (walkAction && idleAction) {
        walkAction.fadeOut(0.2);
        idleAction.reset().fadeIn(0.2).play();
      } else if (idleAction) {
        idleAction.play();
      }
    }
  }, [isMoving]);

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    // Smooth rotational alignment
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        rotationY,
        0.15
      );
    }
  });

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* 180° rotation offset so the model's front aligns with movement heading */}
      <primitive object={clonedScene} rotation={[0, Math.PI, 0]} castShadow receiveShadow />
      
      {/* Tactical Selection Glow Ring */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial color="#55D8F5" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
