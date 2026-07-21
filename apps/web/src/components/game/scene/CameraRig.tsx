'use client';

import { useRef, type ElementRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { GamePhase } from '@chrono-bid/shared-types';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

type OrbitControlsImpl = ElementRef<typeof OrbitControls>;

interface CameraRigProps {
  phase: GamePhase;
  /** World position of the current round's winner, if any — camera target drifts toward it during reveal. */
  winnerPosition: [number, number, number] | null;
}

const CENTER = new THREE.Vector3(0, 0, 0);

export function CameraRig({ phase, winnerPosition }: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const reducedMotion = usePrefersReducedMotion();
  const targetVec = useRef(new THREE.Vector3());

  // Camera holds steady during an active round (players are timing a
  // release and a drifting camera would be actively unhelpful), settles
  // toward the winner's seat on reveal, and drifts gently otherwise.
  const isTense = phase === 'round_active' || phase === 'round_waiting';
  const isRevealing = phase === 'round_reveal';

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || reducedMotion) return;

    const desired = isRevealing && winnerPosition ? new THREE.Vector3(...winnerPosition).multiplyScalar(0.5) : CENTER;

    // Damped lerp rather than a snap, and rate-independent of frame time
    // so it looks the same at 30fps or 120fps.
    const lerpFactor = 1 - Math.pow(0.001, delta);
    targetVec.current.copy(controls.target).lerp(desired, lerpFactor);
    controls.target.copy(targetVec.current);
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableZoom={true}
      minDistance={6}
      maxDistance={11}
      minPolarAngle={Math.PI / 5}
      maxPolarAngle={Math.PI / 2.4}
      autoRotate={!reducedMotion && !isTense && !isRevealing}
      autoRotateSpeed={0.5}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
