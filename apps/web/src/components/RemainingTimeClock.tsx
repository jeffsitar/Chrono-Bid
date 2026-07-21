'use client';

import { useEffect, useRef, useState } from 'react';
import type { SelfPlayerView } from '@chrono-bid/shared-types';
import { formatClockMs } from '../lib/formatTime';

interface Props {
  self: SelfPlayerView;
}

/**
 * Ticks down locally, purely for visual feedback, while the player is
 * holding — "Live countdown only while holding" per spec. The instant
 * they release, the server's authoritative `exactRemainingMs` takes
 * back over. Scoring never depends on this component's math.
 */
export function RemainingTimeClock({ self }: Props) {
  const [displayMs, setDisplayMs] = useState(self.exactRemainingMs);
  const anchorRef = useRef<{ clientStart: number; remainingAtStart: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!self.isHolding) {
      anchorRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setDisplayMs(self.exactRemainingMs);
      return;
    }

    if (!anchorRef.current) {
      anchorRef.current = { clientStart: performance.now(), remainingAtStart: self.exactRemainingMs };
    }

    const tick = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const elapsed = performance.now() - anchor.clientStart;
      setDisplayMs(Math.max(0, anchor.remainingAtStart - elapsed));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [self.isHolding]);

  const critical = displayMs < 10_000;

  return (
    <div className="glass-panel rounded-xl px-4 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">Your time</div>
      <div
        className={`chrono-digits font-mono text-2xl font-semibold ${
          critical ? 'text-red-400' : 'text-white'
        }`}
      >
        {formatClockMs(displayMs)}
      </div>
    </div>
  );
}
