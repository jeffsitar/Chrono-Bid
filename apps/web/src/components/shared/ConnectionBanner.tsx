'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { PublicRoomState } from '@chrono-bid/shared-types';

interface Props {
  connected: boolean;
  room: PublicRoomState | null;
}

export function ConnectionBanner({ connected, room }: Props) {
  const botTakeovers = room?.players.filter((p) => p.connection === 'bot') ?? [];
  const reconnectingOthers = room?.players.filter((p) => p.connection === 'disconnected') ?? [];

  let message: string | null = null;
  let tone: 'warn' | 'info' = 'info';

  if (!connected) {
    message = 'Reconnecting to the server…';
    tone = 'warn';
  } else if (reconnectingOthers.length > 0) {
    message = `${reconnectingOthers.map((p) => p.nickname).join(', ')} lost connection — waiting to reconnect…`;
    tone = 'warn';
  } else if (botTakeovers.length > 0) {
    message = `${botTakeovers.map((p) => p.nickname).join(', ')} didn't reconnect in time and is now played by AI.`;
    tone = 'info';
  }

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`glass-panel fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium ${
            tone === 'warn' ? 'text-amber-300' : 'text-white/60'
          }`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
