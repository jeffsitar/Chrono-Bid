'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei';
import type { GamePhase, PublicPlayerView } from '@chrono-bid/shared-types';
import { computeSeatPositions } from './seatLayout';
import { Table } from './Table';
import { Character } from './Character';
import { CameraRig } from './CameraRig';

interface TableSceneProps {
  players: PublicPlayerView[];
  selfId: string | null;
  winnerId: string | null;
  phase: GamePhase;
}

export function TableScene({ players, selfId, winnerId, phase }: TableSceneProps) {
  const seated = useMemo(() => players.filter((p) => !p.isSpectator), [players]);
  const seats = useMemo(() => computeSeatPositions(seated.length, 2.15), [seated.length]);

  const winnerPosition = useMemo<[number, number, number] | null>(() => {
    if (!winnerId) return null;
    const idx = seated.findIndex((p) => p.id === winnerId);
    const seat = idx >= 0 ? seats[idx] : null;
    return seat ? [seat.x, 0, seat.z] : null;
  }, [winnerId, seated, seats]);

  return (
    <div className="h-full w-full" aria-hidden>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 5.2, 8], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // Renders continuously (characters animate every frame during
        // holding/reveal), but capping dpr and shadow resolution below
        // keeps per-frame GPU cost low with up to 7 characters on screen.
      >
        <color attach="background" args={['#05070d']} />
        <fog attach="fog" args={['#05070d', 9, 20]} />

        <ambientLight intensity={0.35} />
        <pointLight
          position={[0, 4, 0]}
          intensity={1.4}
          color="#38f2ff"
          distance={12}
          decay={2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
        />
        <pointLight position={[4, 3, 4]} intensity={0.6} color="#8b5cf6" distance={14} decay={2} />
        <directionalLight position={[-4, 6, -3]} intensity={0.3} />

        <Suspense fallback={null}>
          <Table />
          {seated.map((p, i) => {
            const seat = seats[i];
            if (!seat) return null;
            return (
              <Character
                key={p.id}
                player={p}
                position={[seat.x, 0, seat.z]}
                angle={seat.angle}
                isSelf={p.id === selfId}
                isWinner={p.id === winnerId}
                phase={phase}
              />
            );
          })}
        </Suspense>

        <CameraRig phase={phase} winnerPosition={winnerPosition} />

        {/* Auto-lowers dpr/event sampling under load instead of dropping
            frames outright — the cheapest generally-correct perf guard
            for a scene whose character count is only known at runtime. */}
        <AdaptiveDpr pixelated={false} />
        <AdaptiveEvents />
        <Preload all />
      </Canvas>
    </div>
  );
}
