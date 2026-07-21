'use client';

import type { PublicPlayerView } from '@chrono-bid/shared-types';
import { getSocket } from '../lib/socketClient';

interface Props {
  players: PublicPlayerView[];
  selfId: string | null;
  isAdmin: boolean;
}

export function PlayerList({ players, selfId, isAdmin }: Props) {
  const socket = getSocket();

  return (
    <ul className="flex flex-col gap-2">
      {players.map((p) => (
        <li
          key={p.id}
          className="glass-panel flex items-center justify-between rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-2 w-2 rounded-full ${
                p.connection === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="font-medium">
              {p.nickname}
              {p.id === selfId && <span className="ml-1.5 text-xs text-white/40">(you)</span>}
            </span>
            {p.isAdmin && (
              <span className="rounded-full border border-violet-glow/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-glow">
                Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                p.ready ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-white/40'
              }`}
            >
              {p.ready ? 'Ready' : 'Not ready'}
            </span>
            {isAdmin && p.id !== selfId && (
              <button
                onClick={() => socket.emit('kick_player', p.id)}
                className="text-xs text-white/40 transition-colors hover:text-red-400"
              >
                Kick
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
