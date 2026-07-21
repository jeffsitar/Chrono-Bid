'use client';

import { useEffect, useState } from 'react';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound';

export function SoundManager() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(isSoundEnabled());
  }, []);

  return (
    <button
      onClick={() => {
        const next = !on;
        setOn(next);
        setSoundEnabled(next);
      }}
      aria-label={on ? 'Mute sound' : 'Unmute sound'}
      className="glass-panel flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}
