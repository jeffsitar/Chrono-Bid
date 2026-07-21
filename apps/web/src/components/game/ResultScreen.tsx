'use client';

import { motion } from 'framer-motion';
import type { FinalStanding } from '@chrono-bid/shared-types';
import { formatSeconds } from '@/lib/formatTime';
import { getSocket } from '@/lib/socketClient';

interface Props {
  standings: FinalStanding[];
  selfId: string | null;
  isAdmin: boolean;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export function ResultScreen({ standings, selfId, isAdmin }: Props) {
  const socket = getSocket();
  const champion = standings[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">Final results</div>
        {champion && (
          <h1 className="mt-2 font-display text-4xl font-bold text-glow-cyan md:text-5xl">
            {champion.nickname} wins
          </h1>
        )}
      </motion.div>

      <div className="glass-panel-raised w-full overflow-hidden rounded-2xl">
        {standings.map((s, i) => (
          <motion.div
            key={s.playerId}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
            className={`flex items-center justify-between gap-3 px-5 py-4 text-left ${
              i > 0 ? 'border-t border-white/[0.06]' : ''
            } ${s.playerId === selfId ? 'bg-cyan-glow/[0.06]' : ''}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 font-display text-lg font-bold text-white/50">
                {MEDAL[i] ?? `#${s.rank}`}
              </span>
              <span className="font-medium">
                {s.nickname}
                {s.playerId === selfId && <span className="ml-1.5 text-xs text-white/40">(you)</span>}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="chrono-digits font-mono text-cyan-glow">{s.victoryTokens} tokens</span>
              <span className="chrono-digits hidden font-mono text-white/50 sm:inline">
                {formatSeconds(s.remainingMs / 1000)} left
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {isAdmin ? (
        <button
          onClick={() => socket.emit('restart_game')}
          className="rounded-xl bg-gradient-to-r from-cyan-glow/80 to-violet-glow/80 px-8 py-3 font-display
            font-bold text-void transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Play again
        </button>
      ) : (
        <p className="text-sm text-white/40">Waiting for the admin to start a new game…</p>
      )}
    </div>
  );
}
