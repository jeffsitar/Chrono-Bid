'use client';

import { useState } from 'react';
import type { ChatMessage } from '@chrono-bid/shared-types';
import { getSocket } from '../lib/socketClient';

interface Props {
  messages: ChatMessage[];
  selfId: string | null;
}

/** Lobby-only chat per spec — the room page simply doesn't render this once the game starts. */
export function ChatPanel({ messages, selfId }: Props) {
  const socket = getSocket();
  const [draft, setDraft] = useState('');

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    socket.emit('send_chat', text);
    setDraft('');
  };

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl">
      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-sm text-white/30">No messages yet — say hi.</p>}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className={`font-semibold ${m.playerId === selfId ? 'text-cyan-glow' : 'text-violet-glow'}`}>
              {m.nickname}:
            </span>{' '}
            <span className="text-white/80">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-white/[0.06] p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          maxLength={300}
          placeholder="Message the lobby…"
          className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:ring-1 focus:ring-cyan-glow/50"
        />
        <button
          onClick={send}
          className="rounded-lg bg-cyan-glow/15 px-3 py-2 text-sm font-medium text-cyan-glow transition-colors hover:bg-cyan-glow/25"
        >
          Send
        </button>
      </div>
    </div>
  );
}
