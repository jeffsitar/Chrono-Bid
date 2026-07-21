'use client';

import { useEffect, useState } from 'react';

/** WCAG 2.3.3 / prefers-reduced-motion: the 3D scene's idle bob, camera
 *  drift, and win/lose pop animations are decorative, not functional —
 *  users who've opted out of motion at the OS level should get the same
 *  game state with the animation amplitude removed, not a broken game. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);
  return reduced;
}
