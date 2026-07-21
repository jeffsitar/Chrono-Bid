'use client';

import { motion } from 'framer-motion';
import { useHoldInteraction } from '../hooks/useHoldInteraction';

interface HoldButtonProps {
  enabled: boolean;
  hasTimeLeft: boolean;
  onHoldChange?: (holding: boolean) => void;
}

export function HoldButton({ enabled, hasTimeLeft, onHoldChange }: HoldButtonProps) {
  const { isHolding, handlers } = useHoldInteraction(enabled && hasTimeLeft);

  const label = !hasTimeLeft ? 'NO TIME LEFT' : isHolding ? 'HOLDING…' : enabled ? 'HOLD TO BID' : 'WAIT';

  return (
    <div className="relative flex items-center justify-center select-none">
      <motion.div
        aria-hidden
        className="absolute h-64 w-64 rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, rgba(56,242,255,0.35), rgba(139,92,246,0.12), transparent)',
        }}
        animate={{ scale: isHolding ? [1, 1.15, 1] : 1, opacity: isHolding ? [0.7, 1, 0.7] : 0.45 }}
        transition={{ duration: 1.1, repeat: isHolding ? Infinity : 0, ease: 'easeInOut' }}
      />
      <motion.button
        type="button"
        role="button"
        aria-pressed={isHolding}
        aria-label={hasTimeLeft ? 'Hold to bid your time. Release to lock in your bid.' : 'No time remaining'}
        disabled={!enabled || !hasTimeLeft}
        className="no-pull relative flex h-52 w-52 flex-col items-center justify-center rounded-full
          border-2 font-display text-lg font-bold tracking-wide outline-none
          transition-colors focus-visible:ring-4 focus-visible:ring-cyan-glow/60
          disabled:cursor-not-allowed disabled:opacity-40 md:h-60 md:w-60"
        style={{
          borderColor: isHolding ? '#38f2ff' : 'rgba(140,170,240,0.35)',
          background: isHolding
            ? 'radial-gradient(circle at 50% 35%, rgba(56,242,255,0.35), rgba(11,15,26,0.9))'
            : 'radial-gradient(circle at 50% 35%, rgba(60,80,140,0.28), rgba(11,15,26,0.92))',
          boxShadow: isHolding
            ? '0 0 60px 6px rgba(56,242,255,0.45), inset 0 0 30px rgba(56,242,255,0.25)'
            : '0 0 30px 2px rgba(80,100,180,0.18)',
        }}
        whileTap={enabled && hasTimeLeft ? { scale: 0.94 } : undefined}
        onPointerDown={(e) => {
          handlers.onPointerDown(e);
          onHoldChange?.(true);
        }}
        onPointerUp={(e) => {
          handlers.onPointerUp(e);
          onHoldChange?.(false);
        }}
        onPointerLeave={handlers.onPointerLeave}
        onContextMenu={handlers.onContextMenu}
      >
        <span className="text-glow-cyan">{label}</span>
        <span className="mt-1 text-[11px] font-normal text-white/50">space bar also works</span>
      </motion.button>
    </div>
  );
}
