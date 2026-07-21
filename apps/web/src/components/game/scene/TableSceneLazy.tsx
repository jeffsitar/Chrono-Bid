'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { TableScene } from './TableScene';

/**
 * @react-three/fiber creates a WebGL context at mount time, which does not
 * exist during server-side rendering and also has no reason to be part of
 * the initial HTML payload — code-splitting it out shrinks the first-load
 * JS bundle for the room page and avoids any SSR/hydration mismatch risk
 * from a canvas-based library.
 */
export const TableSceneLazy = dynamic<ComponentProps<typeof TableScene>>(
  () => import('./TableScene').then((m) => m.TableScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#05070d]" role="status" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-glow/30 border-t-cyan-glow" aria-hidden />
        <span className="sr-only">Loading 3D table…</span>
      </div>
    ),
  }
);
