'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { PublicRoomState } from '@chrono-bid/shared-types';

interface Props {
  room: PublicRoomState;
}

export function RoundBanner({ room }: Props) {
  return (
    <div className="relative flex h-24 flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {room.phase === 'countdown' && room.countdownValue !== null && (
          <motion.div
            key={`cd-${room.countdownValue}`}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="font-display text-6xl font-bold text-glow-cyan"
          >
            {room.countdownValue === 1 ? 'GO' : room.countdownValue}
          </motion.div>
        )}

        {room.phase === 'round_reveal' && room.lastResult && (
          <motion.div
            key={`reveal-${room.lastResult.round}`}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">
              Round {room.lastResult.round} winner
            </div>
            <div className="font-display text-3xl font-bold text-glow-violet">
              {room.lastResult.winnerNickname ?? 'No one'}
            </div>
          </motion.div>
        )}

        {(room.phase === 'round_active' || room.phase === 'round_waiting') && (
          <motion.div
            key="round-live"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm uppercase tracking-[0.25em] text-white/50"
          >
            Round {room.round} / {room.totalRounds}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
