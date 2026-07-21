'use client';

import type { PublicRoomState } from '@chrono-bid/shared-types';
import { TableScene } from './scene/TableScene';
import { RoundBanner } from '../RoundBanner';
import { Scoreboard } from '../Scoreboard';

interface Props {
  room: PublicRoomState;
}

export function SpectatorHUD({ room }: Props) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="glass-panel mx-auto flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-white/50">
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        Spectating — bids are hidden, only the round winner is revealed
      </div>

      <RoundBanner room={room} />

      <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-3xl">
        <TableScene
          players={room.players}
          selfId={null}
          winnerId={room.lastResult?.winnerId ?? null}
          phase={room.phase}
        />
      </div>

      <Scoreboard players={room.players} selfId={null} />
    </div>
  );
}
