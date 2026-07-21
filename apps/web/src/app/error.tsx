'use client';

import { useEffect } from 'react';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[chrono-bid] unhandled app error', error);
  }, [error]);

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-[#05070d] px-6 text-center text-white" role="alert">
      <h1 className="font-display text-xl font-bold text-glow-cyan">Something glitched</h1>
      <p className="max-w-sm text-sm text-white/60">
        Chrono Bid hit an unexpected error. Your game session is unaffected on the server — reconnecting usually fixes this.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border-2 border-cyan-glow/50 px-6 py-2 text-sm font-semibold text-cyan-glow transition hover:bg-cyan-glow/10 focus-visible:ring-4 focus-visible:ring-cyan-glow/60"
      >
        Try again
      </button>
    </div>
  );
}
