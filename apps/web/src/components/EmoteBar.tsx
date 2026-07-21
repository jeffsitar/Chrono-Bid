'use client';

import type { EmoteKind } from '@chrono-bid/shared-types';
import { getSocket } from '../lib/socketClient';

const EMOTES: { kind: EmoteKind; glyph: string }[] = [
  { kind: 'thumbs_up', glyph: '👍' },
  { kind: 'laugh', glyph: '😂' },
  { kind: 'shock', glyph: '😮' },
  { kind: 'devil', glyph: '😈' },
  { kind: 'clap', glyph: '👏' },
];

/** Available only between rounds — parent decides when to render this. */
export function EmoteBar() {
  const socket = getSocket();
  return (
    <div className="glass-panel flex items-center gap-1 rounded-full px-2 py-1.5">
      {EMOTES.map((e) => (
        <button
          key={e.kind}
          onClick={() => socket.emit('send_emote', e.kind)}
          className="rounded-full px-2 py-1 text-lg transition-transform hover:scale-125 active:scale-95"
          aria-label={e.kind.replace('_', ' ')}
        >
          {e.glyph}
        </button>
      ))}
    </div>
  );
}
