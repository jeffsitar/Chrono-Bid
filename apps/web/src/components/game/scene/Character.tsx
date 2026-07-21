'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GamePhase, PublicPlayerView } from '@chrono-bid/shared-types';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface CharacterProps {
  player: PublicPlayerView;
  position: [number, number, number];
  angle: number;
  isSelf: boolean;
  isWinner: boolean;
  /** Current room phase — drives which one-shot animation (win/lose) plays on reveal. */
  phase: GamePhase;
}

const BOT_COLOR = '#8b5cf6';
const SELF_COLOR = '#38f2ff';
const OTHER_COLOR = '#5b6ea8';
const WINNER_COLOR = '#ffd166';

// Shared geometries/materials-by-reference across every Character instance.
// R3F does not automatically dedupe geometry created inline in JSX — each
// <capsuleGeometry> mount allocates its own buffers — so for up to 7
// simultaneous characters we hoist the geometry objects once at module
// scope instead of per-instance, cutting GPU buffer allocations 7x.
const bodyGeometry = new THREE.CapsuleGeometry(0.26, 0.55, 8, 16);
const headGeometry = new THREE.SphereGeometry(0.22, 20, 20);
const ringGeometry = new THREE.RingGeometry(0.34, 0.46, 32);
const crownGeometry = new THREE.ConeGeometry(0.09, 0.14, 4);

export function Character({ player, position, angle, isSelf, isWinner, phase }: CharacterProps) {
  const reducedMotion = usePrefersReducedMotion();
  const motionScale = reducedMotion ? 0 : 1; // zeroes out positional/scale motion, keeps color/opacity cues
  const group = useRef<THREE.Group>(null);
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);
  const headMat = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const t0 = useRef(Math.random() * Math.PI * 2);

  // One-shot reveal-animation clock: reset whenever we enter round_reveal,
  // so the win/lose motion plays once per reveal rather than looping.
  const revealStart = useRef<number | null>(null);
  const lastPhase = useRef<GamePhase>(phase);
  if (lastPhase.current !== phase) {
    if (phase === 'round_reveal') revealStart.current = null; // set on first frame below
    lastPhase.current = phase;
  }

  const baseColor = player.connection === 'bot' ? BOT_COLOR : isSelf ? SELF_COLOR : OTHER_COLOR;
  const isOffline = player.connection === 'disconnected';
  const isRevealing = phase === 'round_reveal';

  useFrame((state) => {
    const t = state.clock.elapsedTime + t0.current;
    if (!group.current || !glowRef.current) return;

    let yOffset = 0;
    let scale = 1;
    let tiltX = 0;
    let glowPulse = 0.22;
    let emissiveBoost = 0;

    if (isRevealing) {
      if (revealStart.current === null) revealStart.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - revealStart.current;

      if (isWinner) {
        // Winning animation: quick upward pop + settle, bright pulse ring,
        // decays over ~1.4s so it reads as a single celebratory beat.
        const decay = Math.max(0, 1 - elapsed / 1.4);
        const pop = Math.sin(Math.min(elapsed * 6, Math.PI)) * 0.18 * decay;
        yOffset = pop;
        scale = 1 + 0.12 * decay * Math.max(0, Math.sin(elapsed * 8));
        glowPulse = 0.5 + Math.sin(elapsed * 10) * 0.4 * decay + 0.3;
        emissiveBoost = 1.2 * decay + 0.4;
      } else if (!player.isSpectator) {
        // Losing animation: a small deflating slump + dim, settles quickly
        // so it never looks broken if the player keeps watching.
        const decay = Math.max(0, 1 - elapsed / 1.0);
        yOffset = -0.08 * decay;
        tiltX = 0.06 * decay;
        scale = 1 - 0.05 * decay;
        glowPulse = Math.max(0.08, 0.22 - 0.14 * decay);
        emissiveBoost = -0.15 * decay;
      }
    } else if (player.isHolding) {
      // Holding animation: fast, tense micro-bob + slight forward lean +
      // strong emissive — reads as "charging" while the button is held.
      yOffset = Math.sin(t * 9) * 0.03;
      tiltX = -0.05 - Math.sin(t * 5) * 0.02;
      scale = 1 + Math.sin(t * 14) * 0.015;
      glowPulse = 0.55 + Math.sin(t * 10) * 0.35;
      emissiveBoost = 0.55;
    } else {
      // Idle animation: slow ambient bob + gentle sway, kept subtle and
      // cheap (single sine each) so it costs nothing with 7 on screen.
      yOffset = Math.sin(t * 1.4) * 0.015;
      tiltX = Math.sin(t * 0.9) * 0.015;
      glowPulse = 0.22;
    }

    group.current.position.y = position[1] + yOffset * motionScale;
    group.current.rotation.x = tiltX * motionScale;
    group.current.scale.setScalar(1 + (scale - 1) * motionScale);

    const ringMat = glowRef.current.material as THREE.MeshBasicMaterial;
    ringMat.opacity = isOffline ? 0.08 : glowPulse;
    ringMat.color.set(isWinner && isRevealing ? WINNER_COLOR : baseColor);

    if (bodyMat.current) {
      bodyMat.current.emissiveIntensity = isOffline ? 0.05 : 0.35 + emissiveBoost;
    }
    if (headMat.current) {
      headMat.current.emissiveIntensity = isOffline ? 0.05 : 0.5 + emissiveBoost * 0.6;
    }
  });

  // Face the center of the table.
  const facing: [number, number, number] = useMemo(() => [0, angle + Math.PI, 0], [angle]);

  return (
    <group ref={group} position={position} rotation={facing}>
      {/* Floor glow ring under the seat */}
      <mesh ref={glowRef} geometry={ringGeometry} position={[0, -0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={baseColor} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Body */}
      <mesh geometry={bodyGeometry} position={[0, -0.35, 0]} castShadow>
        <meshStandardMaterial
          ref={bodyMat}
          color="#0e1424"
          emissive={baseColor}
          emissiveIntensity={0.35}
          metalness={0.4}
          roughness={0.4}
          transparent
          opacity={isOffline ? 0.35 : 1}
        />
      </mesh>

      {/* Head */}
      <mesh geometry={headGeometry} position={[0, 0.28, 0]} castShadow>
        <meshStandardMaterial
          ref={headMat}
          color="#141b30"
          emissive={baseColor}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.5}
          transparent
          opacity={isOffline ? 0.35 : 1}
        />
      </mesh>

      {/* Admin crown accent */}
      {player.isAdmin && (
        <mesh geometry={crownGeometry} position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={0.6} />
        </mesh>
      )}

      {/* Nameplate */}
      <Html position={[0, 0.85, 0]} center distanceFactor={7} occlude={false}>
        <div
          className={`pointer-events-none select-none whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md transition-opacity ${
            isOffline ? 'opacity-40' : ''
          }`}
          style={{
            borderColor: isWinner && isRevealing ? 'rgba(255,209,102,0.7)' : `${baseColor}55`,
            background: 'rgba(6,9,18,0.72)',
            color: isWinner && isRevealing ? '#ffd166' : '#e7ecf7',
          }}
        >
          {player.nickname}
          {player.isSpectator ? ' 👁' : ''} · {player.victoryTokens}⚡
        </div>
      </Html>
    </group>
  );
}
