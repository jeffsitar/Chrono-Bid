'use client';

import type { PublicPlayerView } from '@chrono-bid/shared-types';
import { formatSeconds } from '../lib/formatTime';

interface Props {
  players: PublicPlayerView[];
  selfId: string | null;
}

const CONNECTION_DOT: Record<PublicPlayerView['connection'], string> = {
  connected: 'bg-emerald-400',
  disconnected: 'bg-amber-400 animate-pulseGlow',
  bot: 'bg-violet-400',
};

const CONNECTION_LABEL: Record<PublicPlayerView['connection'], string> = {
  connected: 'Connected',
  disconnected: 'Reconnecting…',
  bot: 'AI',
};

export function Scoreboard({ players, selfId }: Props) {
  const sorted = [...players].sort((a, b) => b.victoryTokens - a.victoryTokens);

  return (
    <div className="glass-panel scrollbar-thin w-full overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.15em] text-white/40">
            <th className="px-4 py-3 font-medium">Player</th>
            <th className="px-4 py-3 font-medium">Tokens</th>
            <th className="px-4 py-3 font-medium">~ Time left</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.id}
              className={`border-t border-white/[0.06] ${p.id === selfId ? 'bg-cyan-glow/[0.06]' : ''}`}
            >
              <td className="px-4 py-2.5 font-medium">
                <span className="inline-flex items-center gap-2">
                  {p.nickname}
                  {p.isAdmin && (
                    <span className="rounded-full border border-violet-glow/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-violet-glow">
                      Admin
                    </span>
                  )}
                  {p.isSpectator && (
                    <span className="rounded-full border border-white/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/50">
                      Spectating
                    </span>
                  )}
                </span>
              </td>
              <td className="chrono-digits px-4 py-2.5 font-mono text-cyan-glow">{p.victoryTokens}</td>
              <td className="chrono-digits px-4 py-2.5 font-mono text-white/80">
                {formatSeconds(p.approxRemainingSeconds)}
              </td>
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                  <span className={`h-1.5 w-1.5 rounded-full ${CONNECTION_DOT[p.connection]}`} />
                  {CONNECTION_LABEL[p.connection]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
