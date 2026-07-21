'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socketClient';

/**
 * Wires up press/hold across mouse, touch, and the spacebar (accessibility
 * requirement), and tells the server exactly once per press/release. The
 * server is the only clock that matters for scoring — this hook only
 * tracks `isHolding` for local UI feedback (button glow, haptic, etc).
 */
export function useHoldInteraction(enabled: boolean) {
  const socket = getSocket();
  const [isHolding, setIsHolding] = useState(false);
  const holdingRef = useRef(false);

  const start = useCallback(() => {
    if (!enabled || holdingRef.current) return;
    holdingRef.current = true;
    setIsHolding(true);
    socket.emit('hold_start');
  }, [enabled, socket]);

  const release = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setIsHolding(false);
    socket.emit('hold_release');
  }, [socket]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      start();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      release();
    };
    // Releasing outside the button (e.g. finger drags off on mobile)
    // must still register as a release — never leave a phantom hold.
    const onPointerUp = () => release();
    const onBlur = () => release();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled, start, release]);

  return {
    isHolding,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        start();
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        release();
      },
      onPointerLeave: () => release(),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}
