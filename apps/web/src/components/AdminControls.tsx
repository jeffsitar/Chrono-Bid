'use client';

import { useState } from 'react';
import type { PublicRoomState } from '@chrono-bid/shared-types';
import { MAX_DURATION_SECONDS, MAX_PLAYERS, MIN_DURATION_SECONDS, MIN_PLAYERS } from '@chrono-bid/shared-types';
import { getSocket } from '../lib/socketClient';
import { formatSeconds } from '../lib/formatTime';

interface Props {
  room: PublicRoomState;
  canStart: boolean;
}

export function AdminControls({ room, canStart }: Props) {
  const socket = getSocket();
  const [duration, setDuration] = useState(room.settings.durationSeconds);

  return (
    <div className="glass-panel-raised space-y-5 rounded-2xl p-5">
      <h3 className="font-display text-sm uppercase tracking-[0.2em] text-white/50">Room controls</h3>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-white/70">Starting time budget</span>
          <span className="chrono-digits font-mono text-cyan-glow">{formatSeconds(duration)}</span>
        </div>
        <input
          type="range"
          min={MIN_DURATION_SECONDS}
          max={MAX_DURATION_SECONDS}
          step={15}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          onMouseUp={() => socket.emit('update_settings', { durationSeconds: duration })}
          onTouchEnd={() => socket.emit('update_settings', { durationSeconds: duration })}
          className="w-full accent-cyan-500"
        />
        <div className="mt-1 flex justify-between text-[11px] text-white/30">
          <span>{MIN_DURATION_SECONDS / 60} min</span>
          <span>{MAX_DURATION_SECONDS / 60} min</span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-white/70">Max players</span>
          <span className="chrono-digits font-mono text-cyan-glow">{room.settings.maxPlayers}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map((n) => (
            <button
              key={n}
              onClick={() => socket.emit('update_settings', { maxPlayers: n })}
              className={`h-8 flex-1 rounded-lg text-sm font-medium transition-colors ${
                room.settings.maxPlayers === n
                  ? 'bg-cyan-glow/25 text-cyan-glow'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between text-sm">
        <span className="text-white/70">Lock room</span>
        <input
          type="checkbox"
          checked={room.settings.locked}
          onChange={(e) => socket.emit('update_settings', { locked: e.target.checked })}
          className="h-4 w-4 accent-violet-500"
        />
      </label>

      <button
        onClick={() => socket.emit('start_game')}
        disabled={!canStart}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-glow/80 to-violet-glow/80 py-3 font-display
          font-bold text-void transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
      >
        Start game
      </button>
      {!canStart && (
        <p className="text-center text-xs text-white/35">
          Need {MIN_PLAYERS}–{MAX_PLAYERS} players, all ready.
        </p>
      )}
    </div>
  );
}
